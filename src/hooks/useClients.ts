import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Client {
  id: string;
  name: string;
  email: string | null;
  organization_id: string;
  created_at: string;
  source_client_user_id?: string | null;
  persisted?: boolean;
}

export const useClients = (organizationId?: string) => {
  const { data: clients, isLoading, error } = useQuery({
    queryKey: ['clients', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      const { data: orgClients, error: orgClientsError } = await supabase
        .from('clients')
        .select('*')
        .eq('organization_id', organizationId)
        .order('name', { ascending: true });

      if (orgClientsError) throw orgClientsError;

      const { data: orgProjects, error: projectsError } = await supabase
        .from('projects')
        .select('id')
        .eq('organization_id', organizationId);

      if (projectsError) throw projectsError;

      const mergedClients = new Map<string, Client>();

      (orgClients || []).forEach((client) => {
        const key = (client.email || `${client.id}@local`).toLowerCase();
        mergedClients.set(key, {
          ...(client as Client),
          email: client.email,
          persisted: true,
          source_client_user_id: null,
        });
      });

      const projectIds = (orgProjects || []).map((project) => project.id);
      if (projectIds.length > 0) {
        const { data: projectClients, error: projectClientsError } = await supabase
          .from('project_clients')
          .select(`
            client_user_id,
            created_at,
            client_users (
              id,
              email,
              full_name
            )
          `)
          .in('project_id', projectIds);

        if (projectClientsError) throw projectClientsError;

        (projectClients || []).forEach((projectClient: any) => {
          const clientUser = projectClient.client_users;
          const email = clientUser?.email?.toLowerCase?.() || null;
          if (!email) return;

          if (!mergedClients.has(email)) {
            mergedClients.set(email, {
              id: `client-user:${projectClient.client_user_id}`,
              name: clientUser?.full_name || email.split('@')[0] || 'Client',
              email,
              organization_id: organizationId,
              created_at: projectClient.created_at || new Date().toISOString(),
              source_client_user_id: projectClient.client_user_id,
              persisted: false,
            });
          }
        });
      }

      return Array.from(mergedClients.values()).sort((a, b) => a.name.localeCompare(b.name));
    },
    enabled: !!organizationId,
  });

  return {
    clients,
    isLoading,
    error,
  };
};
