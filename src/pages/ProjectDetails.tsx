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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { useOrganizationPermissions } from '@/hooks/useOrganizationPermissions';

interface Project {
  id: string;
  name: string;
  status: string | null;
  created_at: string | null;
  organization_id: string | null;
}

interface ClientInfo {
  projectClientId: string;
  clientUserId: string | null;
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
  const { permissions } = useOrganizationPermissions(project?.organization_id);

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
        .maybeSingle();

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
          password_set,
          client_users (
            id,
            email,
            full_name
          )
        `)
        .eq('project_id', projectId);

      if (error) throw error;

      const clientList: ClientInfo[] = (data || []).map((pc: any) => {
        const linkedClient = pc.client_users || null;
        return {
          projectClientId: pc.id,
          clientUserId: pc.client_user_id || null,
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
          <Card className="overflow-hidden border-border/60 bg-card/92 shadow-[0_14px_40px_rgba(2,6,23,0.18)]">
            <CardContent className="p-0">
              <ProjectMessages projectId={project.id} clientCount={clients.length} />
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
              {permissions.manageClients && (
                <InviteClientDialog 
                  projectId={project.id} 
                  projectName={project.name}
                  onInvited={fetchClients}
                />
              )}
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
                      key={client.projectClientId}
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
                      <div className="flex items-center gap-2">
                        <Badge variant={client.password_set ? 'default' : 'secondary'}>
                          {client.password_set ? 'Active' : 'Pending'}
                        </Badge>
                        {permissions.manageClients && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              Revoke
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Revoke Client Access</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will remove the client’s access to this project immediately. You can re‑invite them later if needed.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                onClick={async () => {
                                  try {
                                    const fallbackClientName = client.full_name || client.email;

                                    if (client.clientUserId) {
                                      const messageUpdate = supabase
                                        .from('project_messages')
                                        .update({
                                          client_sender_id: client.clientUserId,
                                          sender_name: fallbackClientName,
                                        })
                                        .eq('project_id', project.id)
                                        .eq('sender_type', 'client')
                                        .or(`client_sender_id.eq.${client.clientUserId},client_sender_id.is.null`);

                                      if (clients.length === 1) {
                                        await messageUpdate;
                                      } else {
                                        await supabase
                                          .from('project_messages')
                                          .update({
                                            client_sender_id: client.clientUserId,
                                            sender_name: fallbackClientName,
                                          })
                                          .eq('project_id', project.id)
                                          .eq('sender_type', 'client')
                                          .eq('client_sender_id', client.clientUserId);
                                      }
                                    }

                                    const { error } = await supabase
                                      .from('project_clients')
                                      .delete()
                                      .eq('id', client.projectClientId);

                                    if (error) throw error;
                                    toast.success('Client access revoked');
                                    fetchClients();
                                  } catch (err) {
                                    const message = err instanceof Error ? err.message : 'Failed to revoke access';
                                    toast.error(message);
                                  }
                                }}
                              >
                                Revoke
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                        )}
                      </div>
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
