import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import ProjectMessages from '@/components/projects/ProjectMessages';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, FolderOpen, MessageSquare, Users, Kanban } from 'lucide-react';
import { format } from 'date-fns';
import InviteClientDialog from '@/components/projects/InviteClientDialog';

interface Project {
  id: string;
  name: string;
  status: string | null;
  created_at: string | null;
  organization_id: string | null;
}

interface ClientInfo {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string | null;
  password_set: boolean;
}

const statusColors: Record<string, string> = {
  active: 'bg-success/20 text-success border-success/30',
  paused: 'bg-warning/20 text-warning border-warning/30',
  completed: 'bg-primary/20 text-primary border-primary/30',
  archived: 'bg-muted text-muted-foreground border-muted',
};

const ProjectDetails = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [project, setProject] = useState<Project | null>(null);
  const [clients, setClients] = useState<ClientInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('messages');

  useEffect(() => {
    if (projectId && user) {
      fetchProjectDetails();
      fetchClients();
    }
  }, [projectId, user]);

  const fetchProjectDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (error) throw error;
      setProject(data);
    } catch (err) {
      console.error('Error fetching project:', err);
    }
  };

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('project_clients')
        .select(`
          id,
          client_user_id,
          created_at,
          password_set
        `)
        .eq('project_id', projectId);

      if (error) throw error;

      const clientUserIds = (data || [])
        .map((pc: { client_user_id?: string | null }) => pc.client_user_id)
        .filter(Boolean) as string[];

      let clientsById: Record<string, { email: string; full_name: string | null }> = {};
      if (clientUserIds.length > 0) {
        const { data: clientUsers, error: clientUsersError } = await supabase
          .from('client_users')
          .select('id, email, full_name')
          .in('id', clientUserIds);

        if (clientUsersError) {
          throw clientUsersError;
        }

        clientsById = (clientUsers || []).reduce((acc, client) => {
          acc[client.id] = {
            email: client.email || 'Unknown',
            full_name: client.full_name,
          };
          return acc;
        }, {} as Record<string, { email: string; full_name: string | null }>);
      }

      const clientList: ClientInfo[] = (data || []).map((pc: any) => {
        const linkedClient = pc.client_user_id ? clientsById[pc.client_user_id] : null;
        return {
          id: pc.client_user_id || pc.id,
          email: linkedClient?.email || 'Unknown',
          full_name: linkedClient?.full_name || null,
          created_at: pc.created_at,
          password_set: pc.password_set,
        };
      });

      setClients(clientList);
    } catch (err) {
      console.error('Error fetching clients:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-2">Project not found</h2>
        <Button onClick={() => navigate('/projects')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Projects
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/projects')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-3 flex-1">
          <div className="w-12 h-12 rounded-lg gradient-primary flex items-center justify-center text-white">
            <FolderOpen className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{project.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className={statusColors[project.status || 'active']}>
                {project.status || 'active'}
              </Badge>
              {project.created_at && (
                <span className="text-sm text-muted-foreground">
                  Created {format(new Date(project.created_at), 'MMM d, yyyy')}
                </span>
              )}
            </div>
          </div>
        </div>
        <Button onClick={() => navigate(`/kanban?project=${project.id}`)}>
          <Kanban className="h-4 w-4 mr-2" />
          View Tasks
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="messages" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Messages
          </TabsTrigger>
          <TabsTrigger value="clients" className="gap-2">
            <Users className="h-4 w-4" />
            Clients ({clients.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="messages">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Client Messages</CardTitle>
              <CardDescription>
                Communicate with your clients about this project
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ProjectMessages projectId={project.id} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clients">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Project Clients</CardTitle>
                <CardDescription>
                  Clients who have access to view this project
                </CardDescription>
              </div>
              <InviteClientDialog 
                projectId={project.id} 
                projectName={project.name}
                onInvited={fetchClients}
              />
            </CardHeader>
            <CardContent>
              {clients.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No clients have been invited yet.</p>
                  <p className="text-sm">Invite clients to give them access to view project progress.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {clients.map((client) => (
                    <div 
                      key={client.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Users className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{client.full_name || client.email}</p>
                          {client.full_name && (
                            <p className="text-sm text-muted-foreground">{client.email}</p>
                          )}
                        </div>
                      </div>
                      <Badge variant={client.password_set ? 'default' : 'secondary'}>
                        {client.password_set ? 'Active' : 'Pending'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProjectDetails;
