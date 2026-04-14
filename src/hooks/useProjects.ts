import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { getStoredOrganizationId, setStoredOrganizationId } from '@/lib/workspace';
import type { Json } from '@/integrations/supabase/types';

export interface Project {
  id: string;
  name: string;
  organization_id: string | null;
  status: string | null;
  created_at: string | null;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  role?: 'owner' | 'admin' | 'member' | null;
  payment_receiving_details?: Json | null;
  payment_account_name?: string | null;
  payment_account_number?: string | null;
  payment_bank_name?: string | null;
  payment_link?: string | null;
}

export const useProjects = () => {
  const { user, profile } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgIdState] = useState<string | null>(() => getStoredOrganizationId());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrganizations = useCallback(async () => {
    if (!user) {
      setOrganizations([]);
      setSelectedOrgIdState(null);
      setStoredOrganizationId(null);
      return;
    }

    const { data, error } = await supabase
      .from('organization_members')
      .select(`
        role,
        organization_id,
        organizations:organization_id (
          id,
          name,
          slug,
          payment_receiving_details,
          payment_account_name,
          payment_account_number,
          payment_bank_name,
          payment_link
        )
      `)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error fetching organizations:', error);
      return;
    }

    const nextOrganizations = (data || [])
      .map((membership) => {
        const organization = Array.isArray(membership.organizations)
          ? membership.organizations[0]
          : membership.organizations;

        if (!organization) return null;

        return {
          ...organization,
          role: membership.role,
        } as Organization;
      })
      .filter((organization): organization is Organization => Boolean(organization))
      .filter((organization, index, allOrganizations) =>
        allOrganizations.findIndex((candidate) => candidate.id === organization.id) === index
      )
      .sort((left, right) => left.name.localeCompare(right.name));

    setOrganizations(nextOrganizations);

    if (nextOrganizations.length === 0) {
      setSelectedOrgIdState(null);
      setStoredOrganizationId(null);
      return;
    }

    setSelectedOrgIdState((currentOrgId) => {
      const targetOrgId = currentOrgId || getStoredOrganizationId();
      const organizationExists = targetOrgId
        ? nextOrganizations.some((org) => org.id === targetOrgId)
        : false;

      const resolvedOrgId = organizationExists ? targetOrgId : nextOrganizations[0].id;
      setStoredOrganizationId(resolvedOrgId);
      return resolvedOrgId;
    });
  }, [user]);

  const setSelectedOrgId = useCallback((organizationId: string | null) => {
    setSelectedOrgIdState(organizationId);
    setStoredOrganizationId(organizationId);
  }, []);

  const fetchProjects = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const accessibleOrganizationIds = organizations.map((organization) => organization.id);

      if (accessibleOrganizationIds.length === 0) {
        setProjects([]);
        return;
      }

      let query = supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (selectedOrgId) {
        query = query.eq('organization_id', selectedOrgId);
      } else {
        query = query.in('organization_id', accessibleOrganizationIds);
      }

      const { data, error } = await query;

      if (error) throw error;
      setProjects(data || []);
    } catch (err) {
      console.error('Error fetching projects:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch projects');
    } finally {
      setLoading(false);
    }
  }, [user, selectedOrgId, organizations]);

  const createProject = async (name: string, organizationId: string) => {
    if (!user) throw new Error('You must be logged in');

    const { data, error } = await supabase
      .from('projects')
      .insert({
        name,
        organization_id: organizationId,
        status: 'active',
      })
      .select()
      .single();

    if (error) throw error;
    
    setProjects(prev => [data, ...prev]);
    return data;
  };

  const updateProject = async (id: string, updates: Partial<Pick<Project, 'name' | 'status'>>) => {
    if (!user) throw new Error('You must be logged in');
    const existingProject = projects.find((project) => project.id === id);

    const { data, error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    const changedFields: string[] = [];
    if (updates.name && updates.name !== existingProject?.name) {
      changedFields.push(`renamed to "${updates.name}"`);
    }
    if (updates.status && updates.status !== existingProject?.status) {
      changedFields.push(`marked ${updates.status}`);
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.access_token && changedFields.length > 0) {
      const { error: emailError } = await supabase.functions.invoke('send-activity-email', {
        body: {
          type: 'project_update',
          projectId: id,
          message: `Project ${changedFields.join(' and ')}.`,
          senderName: profile?.full_name || user.email || 'Your team',
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (emailError) {
        console.warn('Project email notification failed:', emailError);
      }
    }
    
    setProjects(prev => prev.map(p => p.id === id ? data : p));
    return data;
  };

  const deleteProject = async (id: string) => {
    if (!user) throw new Error('You must be logged in');

    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id);

    if (error) throw error;
    
    setProjects(prev => prev.filter(p => p.id !== id));
  };

  const deleteOrganization = async (organizationId: string) => {
    if (!user) throw new Error('You must be logged in');

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;

    const accessToken = sessionData?.session?.access_token;
    if (!accessToken) {
      throw new Error('Not authenticated');
    }

    const { data, error } = await supabase.functions.invoke('delete-organization', {
      body: { organizationId },
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (error) {
      throw error;
    }
    if (!data?.success) {
      throw new Error(data?.error || 'Failed to delete organization');
    }

      setOrganizations(prev => {
        const remaining = prev.filter(org => org.id !== organizationId);
        if (selectedOrgId === organizationId) {
          setSelectedOrgId(null);
        }
        return remaining;
      });
  };

  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`organization-memberships-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'organization_members',
          filter: `user_id=eq.${user.id}`,
        },
        async () => {
          await fetchOrganizations();
          await fetchProjects();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchOrganizations, fetchProjects]);

  const refetch = useCallback(async () => {
    await fetchOrganizations();
    await fetchProjects();
  }, [fetchOrganizations, fetchProjects]);

  return {
    projects,
    organizations,
    selectedOrgId,
    setSelectedOrgId,
    loading,
    error,
    createProject,
    updateProject,
    deleteProject,
    deleteOrganization,
    refetch,
  };
};
