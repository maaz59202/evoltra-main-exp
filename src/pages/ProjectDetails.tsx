import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import ProjectMessages from '@/components/projects/ProjectMessages';
import EditProjectDetailsDialog from '@/components/projects/EditProjectDetailsDialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Building2, CalendarDays, ExternalLink, Flag, FolderOpen, Kanban, MessageSquare, Target, Users } from '@/components/ui/icons';
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
import { useOrganizationMembers } from '@/hooks/useOrganizationMembers';

interface Project {
  assigned_user_id: string | null;
  id: string;
  name: string;
  status: string | null;
  created_at: string | null;
  organization_id: string | null;
  description: string | null;
  due_date: string | null;
  priority: 'low' | 'medium' | 'high' | null;
  milestones: Array<{ id: string; title: string; completed: boolean }>;
  resources: Array<{ id: string; label: string; url: string }>;
  organizations?: { name: string } | null;
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
  active: 'border-emerald-200 bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/20',
  paused: 'border-amber-200 bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/20',
  completed: 'border-violet-200 bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-400 dark:border-violet-500/20',
  archived: 'bg-muted text-muted-foreground border-border/60',
};

const ProjectDetails = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const initialTab = searchParams.get('tab') === 'messages' ? 'messages' : 'overview';
  
  const [project, setProject] = useState<Project | null>(null);
  const [clients, setClients] = useState<ClientInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [showEditDetailsDialog, setShowEditDetailsDialog] = useState(false);
  const [latestClientMessageAt, setLatestClientMessageAt] = useState<string | null>(null);
  const [hasUnreadClientMessages, setHasUnreadClientMessages] = useState(false);
  const { permissions } = useOrganizationPermissions(project?.organization_id);
  const { members } = useOrganizationMembers(project?.organization_id || null);
  const clientMessageSeenStorageKey = projectId ? `project:${projectId}:lastSeenClientMessageAt` : null;

  useEffect(() => {
    if (projectId && user) {
      fetchProjectDetails();
      fetchClients();
    }
  }, [projectId, user]);

  useEffect(() => {
    setActiveTab(searchParams.get('tab') === 'messages' ? 'messages' : 'overview');
  }, [searchParams]);

  const fetchProjectDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          id,
          name,
          status,
          created_at,
          organization_id,
          description,
          due_date,
          priority,
          assigned_user_id,
          milestones,
          resources,
          organizations (
            name
          )
        `)
        .eq('id', projectId)
        .maybeSingle();

      if (error) throw error;
      const normalizedProject = data
        ? {
            ...data,
            organizations: Array.isArray((data as any).organizations)
              ? (data as any).organizations[0] ?? null
              : (data as any).organizations ?? null,
          }
        : null;
      setProject(normalizedProject as Project | null);
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

  const refreshClientMessageSignal = async () => {
    if (!projectId || !user) return;

    try {
      const { data, error } = await supabase
        .from('project_messages')
        .select('created_at')
        .eq('project_id', projectId)
        .eq('sender_type', 'client')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      const nextTimestamp = data?.created_at || null;
      setLatestClientMessageAt(nextTimestamp);

      if (!nextTimestamp || !clientMessageSeenStorageKey) {
        setHasUnreadClientMessages(false);
        return;
      }

      const lastSeenTimestamp = localStorage.getItem(clientMessageSeenStorageKey);
      setHasUnreadClientMessages(!lastSeenTimestamp || new Date(nextTimestamp) > new Date(lastSeenTimestamp));
    } catch (err) {
      console.error('Error checking latest client message:', err);
    }
  };

  useEffect(() => {
    void refreshClientMessageSignal();
  }, [projectId, user]);

  useEffect(() => {
    if (!projectId) return;

    const channel = supabase
      .channel(`project-client-unread-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'project_messages',
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          const newMessage = payload.new as { sender_type?: string; created_at?: string | null };
          if (newMessage.sender_type !== 'client' || !newMessage.created_at) return;

          setLatestClientMessageAt(newMessage.created_at);
          if (activeTab !== 'messages') {
            setHasUnreadClientMessages(true);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, activeTab]);

  useEffect(() => {
    if (activeTab !== 'messages' || !latestClientMessageAt || !clientMessageSeenStorageKey) {
      return;
    }

    localStorage.setItem(clientMessageSeenStorageKey, latestClientMessageAt);
    setHasUnreadClientMessages(false);
  }, [activeTab, latestClientMessageAt, clientMessageSeenStorageKey]);

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-[1320px] space-y-5">
        <Skeleton className="h-8 w-56" />
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <Skeleton className="h-[520px] w-full rounded-[22px]" />
          <div className="space-y-4">
            <Skeleton className="h-48 w-full rounded-[22px]" />
            <Skeleton className="h-36 w-full rounded-[22px]" />
          </div>
        </div>
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

  const workspaceName = project.organizations?.name || 'Workspace';
  const statusLabel = project.status || 'active';
  const priorityTone: Record<string, string> = {
    low: 'text-sky-700 bg-sky-100 border-sky-200 dark:bg-sky-500/20 dark:text-sky-400 dark:border-sky-500/20',
    medium: 'text-amber-700 bg-amber-100 border-amber-200 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/20',
    high: 'text-rose-700 bg-rose-100 border-rose-200 dark:bg-rose-500/20 dark:text-rose-400 dark:border-rose-500/20',
  };
  const milestones = Array.isArray(project.milestones) ? project.milestones : [];
  const completedMilestones = milestones.filter((milestone) => milestone.completed).length;
  const assignedMember = members.find((member) => member.user_id === project.assigned_user_id) || null;
  const assignedLabel =
    assignedMember?.profile?.full_name ||
    assignedMember?.profile?.email ||
    (project.assigned_user_id ? 'Assigned member' : 'Unassigned');
  const resources = Array.isArray(project.resources) ? project.resources : [];

  const updateProjectState = (data: any) => {
    const normalizedProject = {
      ...data,
      organizations: Array.isArray(data?.organizations)
        ? data.organizations[0] ?? null
        : data?.organizations ?? project.organizations ?? null,
    };

    setProject(normalizedProject as Project);
  };

  const handleMilestoneToggle = async (milestoneId: string, completed: boolean) => {
    if (!project) return;

    try {
      const nextMilestones = milestones.map((milestone) =>
        milestone.id === milestoneId ? { ...milestone, completed } : milestone,
      );

      const { data, error } = await supabase
        .from('projects')
        .update({ milestones: nextMilestones })
        .eq('id', project.id)
        .select(`
          id,
          name,
          status,
          created_at,
          organization_id,
          description,
          due_date,
          priority,
          assigned_user_id,
          milestones,
          resources,
          organizations (
            name
          )
        `)
        .single();

      if (error) throw error;

      updateProjectState(data);
      toast.success(completed ? 'Milestone marked complete' : 'Milestone marked open');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update milestone';
      toast.error(message);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1320px] space-y-5">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Button
          variant="ghost"
          className="h-8 rounded-lg px-2 text-muted-foreground hover:text-foreground"
          onClick={() => navigate('/projects')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Projects
        </Button>
        <span>/</span>
        <span className="truncate text-foreground">{project.name}</span>
      </div>

      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 space-y-3">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-border/50 bg-card/40 text-muted-foreground">
              <FolderOpen className="h-5 w-5" />
            </div>
            <div className="min-w-0 space-y-2">
              <h1 className="truncate text-[2rem] font-semibold tracking-tight">{project.name}</h1>
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="outline" className={statusColors[statusLabel]}>
                {statusLabel}
                </Badge>
                {project.priority && (
                  <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium capitalize ${priorityTone[project.priority] || 'border-border/50 text-muted-foreground'}`}>
                    <Flag className="h-3.5 w-3.5" />
                    {project.priority} priority
                  </span>
                )}
                <span className="rounded-full border border-border/50 px-3 py-1 text-xs text-muted-foreground">
                  {clients.length} client{clients.length === 1 ? '' : 's'}
                </span>
                {project.created_at && (
                  <span className="inline-flex items-center gap-2 rounded-full border border-border/50 px-3 py-1 text-xs text-muted-foreground">
                    <CalendarDays className="h-3.5 w-3.5" />
                    Created {format(new Date(project.created_at), 'MMM d, yyyy')}
                  </span>
                )}
                <span className="inline-flex items-center gap-2 rounded-full border border-border/50 px-3 py-1 text-xs text-muted-foreground">
                  <Building2 className="h-3.5 w-3.5" />
                  {workspaceName}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {permissions.manageProjects && (
            <Button
              variant="outline"
              onClick={() => setShowEditDetailsDialog(true)}
              className="h-9 rounded-lg px-4"
            >
              Edit details
            </Button>
          )}
          {permissions.manageClients && (
            <InviteClientDialog
              projectId={project.id}
              projectName={project.name}
              onInvited={fetchClients}
            />
          )}
          <Button onClick={() => navigate(`/kanban?project=${project.id}`)} className="h-9 rounded-lg px-4">
            <Kanban className="mr-2 h-4 w-4" />
            Open board
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="h-10 rounded-lg border border-border/60 bg-background/40 p-1">
          <TabsTrigger value="overview" className="gap-2 rounded-md">
            Overview
          </TabsTrigger>
          <TabsTrigger value="messages" className="gap-2 rounded-md">
            <MessageSquare className="h-4 w-4" />
            Messages
            {hasUnreadClientMessages && <span className="h-2 w-2 rounded-full bg-primary" aria-hidden="true" />}
          </TabsTrigger>
          <TabsTrigger value="clients" className="gap-2 rounded-md">
            <Users className="h-4 w-4" />
            Clients ({clients.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="m-0">
          <Card className="rounded-[22px] border-border/50 bg-card/25 shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Project overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl border border-border/40 bg-background/25 px-4 py-4 text-sm">
                <div className="mb-2 text-muted-foreground">Description</div>
                <p className="leading-6 text-foreground">
                  {project.description || 'No description added yet.'}
                </p>
              </div>

              <div className="rounded-xl border border-border/40 bg-background/25 px-4 py-4 text-sm">
                <div className="mb-2 text-muted-foreground">Assigned</div>
                <p className="font-medium text-foreground">{assignedLabel}</p>
              </div>

              <div className="rounded-xl border border-border/40 bg-background/25 px-4 py-4 text-sm">
                <div className="mb-3 text-muted-foreground">Resources</div>
                {resources.length === 0 ? (
                  <p className="text-muted-foreground">No resources added yet.</p>
                ) : (
                  <div className="space-y-2">
                    {resources.map((resource) => (
                      <a
                        key={resource.id}
                        href={resource.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between rounded-lg border border-border/40 bg-background/20 px-3 py-3 transition-colors hover:bg-accent/20"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">{resource.label}</p>
                          <p className="truncate text-muted-foreground">{resource.url}</p>
                        </div>
                        <ExternalLink className="ml-3 h-4 w-4 shrink-0 text-muted-foreground" />
                      </a>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-border/40 bg-background/25 px-4 py-4 text-sm">
                <div className="mb-1 text-muted-foreground">Milestones</div>
                <p className="mb-3 text-sm text-muted-foreground">
                  {completedMilestones}/{milestones.length} completed
                </p>
                {milestones.length === 0 ? (
                  <p className="text-muted-foreground">No milestones added yet.</p>
                ) : (
                  <div className="space-y-2">
                    {milestones.map((milestone) => (
                      <label
                        key={milestone.id}
                        className="flex items-center gap-3 rounded-lg border border-border/40 bg-background/20 px-3 py-3"
                      >
                        <Checkbox
                          checked={milestone.completed}
                          onCheckedChange={(checked) => void handleMilestoneToggle(milestone.id, checked === true)}
                        />
                        <span className={milestone.completed ? 'text-muted-foreground line-through' : 'text-foreground'}>
                          {milestone.title}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

      <TabsContent value="messages">
          <Card className="overflow-hidden rounded-[22px] border-border/50 bg-card/25 shadow-none">
            <CardContent className="p-0">
              <ProjectMessages projectId={project.id} clientCount={clients.length} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clients">
          <Card className="rounded-[22px] border-border/50 bg-card/25 shadow-none">
            <CardHeader className="flex flex-row items-center justify-between border-b border-border/40 px-5 py-4">
              <div>
                <CardTitle className="text-lg">Project Clients</CardTitle>
                <CardDescription>
                  Clients who can view project progress, invoices, and messages.
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
            <CardContent className="px-5 py-5">
              {clients.length === 0 ? (
                <div className="py-10 text-center text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No clients have been invited yet.</p>
                  <p className="text-sm">Invite clients to give them access to view project progress.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {clients.map((client) => (
                    <div 
                      key={client.projectClientId}
                      className="flex items-center justify-between rounded-xl border border-border/40 bg-background/20 px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
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

      {permissions.manageProjects && (
        <EditProjectDetailsDialog
          open={showEditDetailsDialog}
          onOpenChange={setShowEditDetailsDialog}
          project={project}
          onSave={async (updates) => {
            const { data, error } = await supabase
              .from('projects')
              .update(updates)
              .eq('id', project.id)
              .select(`
                id,
                name,
                status,
                created_at,
                organization_id,
                description,
                due_date,
                priority,
                assigned_user_id,
                milestones,
                resources,
                organizations (
                  name
                )
              `)
              .single();

            if (error) throw error;

            updateProjectState(data);
            toast.success('Project details updated');
          }}
        />
      )}
    </div>
  );
};

export default ProjectDetails;
