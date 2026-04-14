import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { ROLE_PERMISSIONS } from '@/data/productCopy';

export interface TeamMember {
  id: string;
  user_id: string;
  organization_id: string;
  role: string;
  created_at: string | null;
  profile?: {
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
    mode?: 'solo' | 'team' | null;
  };
}

export interface TeamInvite {
  id: string;
  organization_id: string;
  email: string;
  role: string;
  invited_by: string | null;
  token: string;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

export type MemberRole = 'owner' | 'admin' | 'member';

export const useTeamManagement = (organizationId: string | null, organizationName?: string) => {
  const { user } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invites, setInvites] = useState<TeamInvite[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<MemberRole | null>(null);

  const fetchMembers = useCallback(async () => {
    if (!user || !organizationId) {
      setMembers([]);
      setInvites([]);
      setCurrentUserRole(null);
      return;
    }

    setLoading(true);

    try {
      // Fetch organization members
      const { data: membersData, error: membersError } = await supabase
        .from('organization_members')
        .select('*')
        .eq('organization_id', organizationId);

      if (membersError) throw membersError;

      // Fetch profiles for each member
      if (membersData && membersData.length > 0) {
        const userIds = membersData.map(m => m.user_id).filter(Boolean);
        
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, email, avatar_url, mode')
          .in('user_id', userIds);

        const missingUserIds = userIds.filter((userId) => !(profiles || []).some((profile) => profile.user_id === userId));
        let resolvedIdentities: Record<string, { full_name: string | null; email: string | null; avatar_url: string | null }> = {};

        if (missingUserIds.length > 0) {
          const {
            data: { session },
          } = await supabase.auth.getSession();

          if (session?.access_token) {
            const { data: identityData, error: identityError } = await supabase.functions.invoke('resolve-user-identities', {
              body: { userIds: missingUserIds, organizationId },
              headers: {
                Authorization: `Bearer ${session.access_token}`,
              },
            });

            if (identityError) {
              console.warn('Failed to resolve missing team identities:', identityError);
            } else {
              resolvedIdentities = identityData?.identities || {};
            }
          }
        }

        const membersWithProfiles = membersData.map(member => ({
          ...member,
          profile:
            profiles?.find(p => p.user_id === member.user_id) ||
            resolvedIdentities[member.user_id] ||
            undefined
        }));

        setMembers(membersWithProfiles as TeamMember[]);

        // Find current user's role
        const currentMember = membersData.find(m => m.user_id === user.id);
        const nextCurrentUserRole = (currentMember?.role as MemberRole) || null;
        setCurrentUserRole(nextCurrentUserRole);

        const memberEmails = new Set(
          (profiles || [])
            .map((profile) => profile.email?.toLowerCase().trim())
            .filter((email): email is string => Boolean(email))
        );

        // Fetch pending invites
        const { data: invitesData, error: invitesError } = await supabase
          .from('team_invites')
          .select('*')
          .eq('organization_id', organizationId)
          .is('accepted_at', null);

        if (invitesError) throw invitesError;

        const visibleInvites = ((invitesData as TeamInvite[]) || []).filter((invite) => {
          const normalizedInviteEmail = invite.email.toLowerCase().trim();
          return !memberEmails.has(normalizedInviteEmail);
        });

        setInvites(nextCurrentUserRole && ROLE_PERMISSIONS[nextCurrentUserRole].manageMembers ? visibleInvites : []);
      } else {
        setMembers([]);
        setCurrentUserRole(null);
        setInvites([]);
      }

    } catch (err) {
      console.error('Error fetching team data:', err);
      toast.error('Failed to load team data');
    } finally {
      setLoading(false);
    }
  }, [user, organizationId]);

  const inviteMember = async (email: string, role: MemberRole = 'member') => {
    if (!user || !organizationId) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('team_invites')
      .insert({
        organization_id: organizationId,
        email: email.toLowerCase().trim(),
        role,
        invited_by: user.id,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new Error('This email has already been invited');
      }
      throw error;
    }

    // Send invitation email
    const inviteLink = `${window.location.origin}/invite/${data.token}`;
    
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', user.id)
        .maybeSingle();

      await supabase.functions.invoke('send-invite-email', {
        body: {
          to: email.toLowerCase().trim(),
          inviterName: profile?.full_name || user.email,
          organizationName: organizationName || 'your team',
          role,
          inviteLink,
        },
      });
    } catch (emailError) {
      console.error('Failed to send invite email:', emailError);
      // Don't fail the invite if email fails - they can still use the link
      toast.warning('Invite created but email failed to send. You can share the link manually.');
    }

    setInvites(prev => [...prev, data as TeamInvite]);
    toast.success(`Invitation sent to ${email}`);
    return data;
  };

  const cancelInvite = async (inviteId: string) => {
    const { error } = await supabase
      .from('team_invites')
      .delete()
      .eq('id', inviteId);

    if (error) throw error;

    setInvites(prev => prev.filter(i => i.id !== inviteId));
    toast.success('Invitation cancelled');
  };

  const updateMemberRole = async (memberId: string, newRole: MemberRole) => {
    const member = members.find(m => m.id === memberId);
    if (member?.role === 'owner') {
      throw new Error('Cannot change owner role');
    }

    const { error } = await supabase
      .from('organization_members')
      .update({ role: newRole })
      .eq('id', memberId);

    if (error) throw error;

    setMembers(prev => prev.map(m => 
      m.id === memberId ? { ...m, role: newRole } : m
    ));
    toast.success('Member role updated');
  };

  const removeMember = async (memberId: string) => {
    const member = members.find(m => m.id === memberId);
    if (member?.role === 'owner') {
      throw new Error('Cannot remove organization owner');
    }

    const { error } = await supabase
      .from('organization_members')
      .delete()
      .eq('id', memberId);

    if (error) throw error;

    setMembers(prev => prev.filter(m => m.id !== memberId));
    toast.success('Member removed from team');
  };

  const canManageMembers = currentUserRole ? ROLE_PERMISSIONS[currentUserRole].manageMembers : false;
  const canManageProjects = currentUserRole ? ROLE_PERMISSIONS[currentUserRole].manageProjects : false;
  const canManageSettings = currentUserRole ? ROLE_PERMISSIONS[currentUserRole].manageSettings : false;
  const organizationPlan =
    members.find((member) => member.role === 'owner')?.profile?.mode === 'team' ? 'team' : 'solo';

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  return {
    members,
    invites,
    loading,
    currentUserRole,
    canManageMembers,
    canManageProjects,
    canManageSettings,
    organizationPlan,
    inviteMember,
    cancelInvite,
    updateMemberRole,
    removeMember,
    refetch: fetchMembers,
  };
};
