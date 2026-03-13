import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Funnel, Widget } from '@/types/funnel';
import { toast } from 'sonner';

// Database row type
interface FunnelRow {
  id: string;
  name: string;
  status: string;
  organization_id: string | null;
  widgets: Widget[];
  published_url: string | null;
  created_at: string;
  updated_at: string;
}

// Convert DB row to Funnel type
const rowToFunnel = (row: FunnelRow): Funnel => ({
  id: row.id,
  name: row.name,
  status: row.status as 'draft' | 'published',
  workspaceId: row.organization_id || '',
  widgets: row.widgets || [],
  publishedUrl: row.published_url || undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const useFunnels = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all funnels for the user's organization
  const { data: funnels = [], isLoading, error } = useQuery({
    queryKey: ['funnels'],
    queryFn: async () => {
      // Use raw SQL query since the funnels table is not in generated types
      const { data, error } = await supabase
        .from('funnels' as any)
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return (data as unknown as FunnelRow[]).map(rowToFunnel);
    },
    enabled: !!user,
  });

  // Create a new funnel
  const createFunnelMutation = useMutation({
    mutationFn: async ({ name, organizationId, widgets = [] }: { name: string; organizationId: string; widgets?: Widget[] }) => {
      const funnelId = crypto.randomUUID();
      
      const { data, error } = await supabase
        .from('funnels' as any)
        .insert({
          id: funnelId,
          name,
          organization_id: organizationId,
          status: 'draft',
          widgets,
        })
        .select()
        .single();

      if (error) throw error;
      return rowToFunnel(data as unknown as FunnelRow);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['funnels'] });
      toast.success('Funnel created');
    },
    onError: (error) => {
      console.error('Error creating funnel:', error);
      toast.error('Failed to create funnel');
    },
  });

  // Update a funnel
  const updateFunnelMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Funnel> }) => {
      const dbUpdates: Record<string, unknown> = {};
      
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.widgets !== undefined) dbUpdates.widgets = updates.widgets;
      if (updates.publishedUrl !== undefined) dbUpdates.published_url = updates.publishedUrl;

      const { data, error } = await supabase
        .from('funnels' as any)
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return rowToFunnel(data as unknown as FunnelRow);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['funnels'] });
    },
    onError: (error) => {
      console.error('Error updating funnel:', error);
      toast.error('Failed to save funnel');
    },
  });

  // Delete a funnel
  const deleteFunnelMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('funnels' as any)
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['funnels'] });
      toast.success('Funnel deleted');
    },
    onError: (error) => {
      console.error('Error deleting funnel:', error);
      toast.error('Failed to delete funnel');
    },
  });

  // Fetch a single funnel by ID
  const useFunnel = (funnelId: string | undefined) => {
    return useQuery({
      queryKey: ['funnel', funnelId],
      queryFn: async () => {
        if (!funnelId) return null;
        
        const { data, error } = await supabase
          .from('funnels' as any)
          .select('*')
          .eq('id', funnelId)
          .maybeSingle();

        if (error) throw error;
        if (!data) return null;
        return rowToFunnel(data as unknown as FunnelRow);
      },
      enabled: !!funnelId && !!user,
    });
  };

  return {
    funnels,
    isLoading,
    error,
    createFunnel: createFunnelMutation.mutateAsync,
    updateFunnel: updateFunnelMutation.mutateAsync,
    deleteFunnel: deleteFunnelMutation.mutateAsync,
    isCreating: createFunnelMutation.isPending,
    isUpdating: updateFunnelMutation.isPending,
    isDeleting: deleteFunnelMutation.isPending,
    useFunnel,
  };
};
