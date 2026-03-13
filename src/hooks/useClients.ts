import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Client {
  id: string;
  name: string;
  email: string;
  organization_id: string;
  created_at: string;
}

export const useClients = (organizationId?: string) => {
  const { data: clients, isLoading, error } = useQuery({
    queryKey: ['clients', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('organization_id', organizationId)
        .order('name', { ascending: true });

      if (error) throw error;
      return data as Client[];
    },
    enabled: !!organizationId,
  });

  return {
    clients,
    isLoading,
    error,
  };
};
