import { Spinner } from '@/components/ui/spinner';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import CreateProjectDialog from '@/components/projects/CreateProjectDialog';
import CreateOrganizationDialog from '@/components/organizations/CreateOrganizationDialog';
import { useProjects } from '@/hooks/useProjects';
import { ROLE_PERMISSIONS } from '@/data/productCopy';
import { Plus, Search, FolderOpen,  Building2, CheckCircle2, Archive, Trash2, Flag, CalendarDays, Target } from '@/components/ui/icons';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal } from '@/components/ui/icons';

const Projects = () => {
  const navigate = useNavigate();
  const {
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
  } = useProjects();

  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showOrgDialog, setShowOrgDialog] = useState(false);
  const [showDeleteOrgDialog, setShowDeleteOrgDialog] = useState(false);
  const [projectDialogAction, setProjectDialogAction] = useState<'complete' | 'archive' | 'delete' | null>(null);
  const [projectActionTarget, setProjectActionTarget] = useState<(typeof projects)[number] | null>(null);
  const selectedOrganization = organizations.find((organization) => organization.id === selectedOrgId) || null;
  const selectedPermissions = selectedOrganization?.role ? ROLE_PERMISSIONS[selectedOrganization.role] : null;
  const organizationPermissions = new Map(
    organizations
      .filter((organization) => organization.role)
      .map((organization) => [organization.id, ROLE_PERMISSIONS[organization.role!]])
  );
  const manageableOrganizations = organizations.filter(
    (organization) => organization.role && ROLE_PERMISSIONS[organization.role].manageProjects
  );
  const canCreateProject =
    selectedOrgId
      ? !!selectedPermissions?.manageProjects
      : manageableOrganizations.length > 0;
  const canDeleteSelectedOrganization = selectedOrganization?.role === 'owner';

  const filteredProjects = projects.filter((project) =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreate = async (name: string, organizationId: string) => {
    await createProject(name, organizationId);
    toast.success('Project created successfully');
  };

  const openProjectActionDialog = (
    action: 'complete' | 'archive' | 'delete',
    project: (typeof projects)[number],
  ) => {
    setProjectDialogAction(action);
    setProjectActionTarget(project);
  };

  const handleProjectAction = async () => {
    if (!projectActionTarget || !projectDialogAction) return;

    try {
      if (projectDialogAction === 'delete') {
        await deleteProject(projectActionTarget.id);
        toast.success('Project deleted');
      } else {
        const nextStatus = projectDialogAction === 'complete' ? 'completed' : 'archived';
        await updateProject(projectActionTarget.id, { status: nextStatus });
        toast.success(
          projectDialogAction === 'complete' ? 'Project marked complete' : 'Project archived',
        );
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update project';
      toast.error(message);
    } finally {
      setProjectDialogAction(null);
      setProjectActionTarget(null);
    }
  };

  const statusTone: Record<string, string> = {
    active: 'border-emerald-200 bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/20',
    completed: 'border-blue-200 bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400 dark:border-blue-500/20',
    archived: 'bg-muted text-muted-foreground border-border/60',
    paused: 'border-amber-200 bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/20',
  };
  const priorityTone: Record<string, string> = {
    low: 'text-sky-700 bg-sky-100 border-sky-200 dark:bg-sky-500/20 dark:text-sky-400 dark:border-sky-500/20',
    medium: 'text-amber-700 bg-amber-100 border-amber-200 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/20',
    high: 'text-rose-700 bg-rose-100 border-rose-200 dark:bg-rose-500/20 dark:text-rose-400 dark:border-rose-500/20',
  };

  return (
    <div className="mx-auto w-full max-w-[1320px] space-y-6">
      <div className="space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <div className="text-[11px] font-medium uppercase tracking-[0.28em] text-muted-foreground">Workspace</div>
            <h1 className="text-[2rem] font-semibold tracking-tight">Projects</h1>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              Track work across organizations.
            </p>
          </div>

          <Button
            onClick={() => setShowCreateDialog(true)}
            className="h-9 rounded-lg px-4"
            disabled={!canCreateProject}
          >
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{projects.length} total</Badge>
          <Badge variant="outline">{filteredProjects.length} visible</Badge>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 rounded-lg border-border/60 bg-background pl-9"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={selectedOrgId || 'all'}
              onValueChange={(value) => setSelectedOrgId(value === 'all' ? null : value)}
            >
              <SelectTrigger className="h-9 min-w-[220px] rounded-lg border-border/60 bg-background shadow-none sm:w-[232px]">
                <Building2 className="mr-2 h-4 w-4" />
                <SelectValue placeholder="All Organizations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Organizations</SelectItem>
                {organizations.map((org) => (
                  <SelectItem key={org.id} value={org.id}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={() => setShowOrgDialog(true)} className="h-9 rounded-lg px-3.5">
              <Building2 className="mr-2 h-4 w-4" />
              New Organization
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg" disabled={!selectedOrgId}>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  disabled={!selectedOrgId || !canDeleteSelectedOrganization}
                  onClick={() => setShowDeleteOrgDialog(true)}
                >
                  Delete organization
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner className="w-8 h-8 text-primary" />
        </div>
      ) : error ? (
        <div className="text-center py-20">
          <p className="text-destructive">{error}</p>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <FolderOpen className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No projects found</h3>
          <p className="text-muted-foreground mb-6">
            {searchQuery
              ? 'Try a different search term'
              : organizations.length === 0
              ? 'Create an organization to get started'
              : 'Create your first project to get started'}
          </p>
          {organizations.length === 0 && !searchQuery ? (
            <Button onClick={() => setShowOrgDialog(true)}>
              <Building2 className="w-4 h-4 mr-2" />
              Create Organization
            </Button>
          ) : organizations.length > 0 && !searchQuery ? (
            <Button onClick={() => setShowCreateDialog(true)} disabled={!canCreateProject}>
              <Plus className="w-4 h-4 mr-2" />
              Create Project
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="overflow-hidden rounded-[22px] border border-border/50 bg-card/25">
          <div className="grid grid-cols-[minmax(0,1.7fr)_110px_140px_120px_120px_130px_140px_72px] gap-4 border-b border-border/40 px-5 py-3 text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
            <div>Name</div>
            <div>Priority</div>
            <div>Timeline</div>
            <div>Milestones</div>
            <div>Status</div>
            <div>Created</div>
            <div>Workspace</div>
            <div className="text-right">Actions</div>
          </div>

          <div className="divide-y divide-border/30">
            {filteredProjects.map((project) => {
              const projectPermissions = project.organization_id
                ? organizationPermissions.get(project.organization_id)
                : null;
              const projectOrg = organizations.find((org) => org.id === project.organization_id);

              const canManageProject = !!projectPermissions?.manageProjects;

              return (
                <div
                  key={project.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/project/${project.id}`)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      navigate(`/project/${project.id}`);
                    }
                  }}
                  className="grid w-full cursor-pointer grid-cols-[minmax(0,1.7fr)_110px_140px_120px_120px_130px_140px_72px] gap-4 px-5 py-4 text-left transition-colors hover:bg-accent/20"
                >
                  <div className="min-w-0">
                    <div className="truncate text-[15px] font-medium text-foreground">{project.name}</div>
                    <div className="mt-1 truncate text-sm text-muted-foreground">
                      {project.description || (projectPermissions?.manageClients ? 'Client access enabled' : 'Read-only visibility')}
                    </div>
                  </div>

                  <div className="flex items-center text-sm text-muted-foreground capitalize">
                    {project.priority ? (
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${priorityTone[project.priority] || ''}`}>
                        <Flag className="h-3 w-3" />
                        {project.priority}
                      </span>
                    ) : (
                      'Unset'
                    )}
                  </div>

                  <div className="flex items-center text-sm text-muted-foreground">
                    {project.due_date ? (
                      <span className="inline-flex items-center gap-2">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {new Date(project.due_date).toLocaleDateString()}
                      </span>
                    ) : (
                      `Created ${project.created_at ? new Date(project.created_at).toLocaleDateString() : '-'}`
                    )}
                  </div>

                  <div className="flex items-center text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-2">
                      <Target className="h-3.5 w-3.5" />
                      {Array.isArray(project.milestones)
                        ? `${project.milestones.filter((milestone) => milestone.completed).length}/${project.milestones.length}`
                        : '0/0'}
                    </span>
                  </div>

                  <div className="flex items-center">
                    <Badge
                      variant="outline"
                      className={`rounded-full capitalize ${statusTone[project.status || 'active'] || statusTone.active}`}
                    >
                      {project.status || 'active'}
                    </Badge>
                  </div>

                  <div className="flex items-center text-sm text-muted-foreground">
                    {project.created_at ? new Date(project.created_at).toLocaleDateString() : '-'}
                  </div>

                  <div className="flex items-center truncate text-sm text-muted-foreground">
                    {projectOrg?.name || 'Workspace'}
                  </div>

                  <div className="flex items-center justify-end">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(event) => event.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" onClick={(event) => event.stopPropagation()}>
                        <DropdownMenuItem onClick={() => navigate(`/project/${project.id}`)}>
                          Open project
                        </DropdownMenuItem>
                        {canManageProject && project.status !== 'completed' && (
                          <DropdownMenuItem onClick={() => openProjectActionDialog('complete', project)}>
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Mark complete
                          </DropdownMenuItem>
                        )}
                        {canManageProject && project.status !== 'archived' && (
                          <DropdownMenuItem onClick={() => openProjectActionDialog('archive', project)}>
                            <Archive className="mr-2 h-4 w-4" />
                            Archive
                          </DropdownMenuItem>
                        )}
                        {canManageProject && (
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => openProjectActionDialog('delete', project)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <CreateProjectDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        organizations={manageableOrganizations}
        selectedOrgId={selectedOrgId}
        onCreate={handleCreate}
      />

      <CreateOrganizationDialog
        open={showOrgDialog}
        onOpenChange={setShowOrgDialog}
        onSuccess={() => {
          refetch();
          toast.success('Organization created!');
        }}
      />

      <AlertDialog open={showDeleteOrgDialog} onOpenChange={setShowDeleteOrgDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Organization</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the organization and all associated data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (!selectedOrgId) return;
                try {
                  await deleteOrganization(selectedOrgId);
                  await refetch();
                  toast.success('Organization deleted');
                } catch (err) {
                  const message = err instanceof Error ? err.message : 'Failed to delete organization';
                  toast.error(message);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!projectDialogAction && !!projectActionTarget}
        onOpenChange={(open) => {
          if (!open) {
            setProjectDialogAction(null);
            setProjectActionTarget(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {projectDialogAction === 'delete'
                ? 'Delete project'
                : projectDialogAction === 'archive'
                ? 'Archive project'
                : 'Mark project complete'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {projectDialogAction === 'delete'
                ? `Delete ${projectActionTarget?.name}? This permanently removes the project and its related data.`
                : projectDialogAction === 'archive'
                ? `Archive ${projectActionTarget?.name}? It will stay in the system but move out of active work.`
                : `Mark ${projectActionTarget?.name} as complete? You can still access it later from the project list.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={
                projectDialogAction === 'delete'
                  ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                  : undefined
              }
              onClick={handleProjectAction}
            >
              {projectDialogAction === 'delete'
                ? 'Delete'
                : projectDialogAction === 'archive'
                ? 'Archive'
                : 'Mark complete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Projects;
