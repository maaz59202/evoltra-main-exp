import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface OrganizationMember {
  id: string;
  user_id: string;
  organization_id: string;
  role: string;
  created_at: string | null;
  profile?: {
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  };
}

export const useOrganizationMembers = (organizationId: string | null) => {
  const { user } = useAuth();
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMembers = useCallback(async () => {
    if (!user || !organizationId) {
      setMembers([]);
      return;
    }

    setLoading(true);
    setError(null);

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
          .select('user_id, full_name, email, avatar_url')
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
              console.warn('Failed to resolve missing member identities:', identityError);
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

        setMembers(membersWithProfiles as OrganizationMember[]);
      } else {
        setMembers([]);
      }
    } catch (err) {
      console.error('Error fetching members:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch members');
    } finally {
      setLoading(false);
    }
  }, [user, organizationId]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  return {
    members,
    loading,
    error,
    refetch: fetchMembers,
  };
};
