import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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
}

export const useProjects = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrganizations = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching organizations:', error);
      return;
    }

    setOrganizations(data || []);
    if (data && data.length > 0 && !selectedOrgId) {
      setSelectedOrgId(data[0].id);
    }
  }, [user, selectedOrgId]);

  const fetchProjects = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (selectedOrgId) {
        query = query.eq('organization_id', selectedOrgId);
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
  }, [user, selectedOrgId]);

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

    const { data, error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    
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
        setSelectedOrgId(remaining[0]?.id || null);
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
