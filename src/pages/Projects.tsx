import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import ProjectCard from '@/components/projects/ProjectCard';
import CreateProjectDialog from '@/components/projects/CreateProjectDialog';
import CreateOrganizationDialog from '@/components/organizations/CreateOrganizationDialog';
import { useProjects } from '@/hooks/useProjects';
import { ROLE_PERMISSIONS } from '@/data/productCopy';
import { Plus, Search, FolderOpen, Loader2, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
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

const Projects = () => {
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

  const handleUpdate = async (id: string, updates: Parameters<typeof updateProject>[1]) => {
    await updateProject(id, updates);
    toast.success('Project updated');
  };

  const handleDelete = async (id: string) => {
    await deleteProject(id);
    toast.success('Project deleted');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Projects</h1>
          <p className="text-muted-foreground mt-1">
            Manage your projects and track progress
          </p>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{projects.length} total</Badge>
            <Badge variant="outline">{filteredProjects.length} visible</Badge>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          <Button variant="outline" onClick={() => setShowOrgDialog(true)} className="w-full md:w-auto">
            <Building2 className="w-4 h-4 mr-2" />
            New Organization
          </Button>
          <Button onClick={() => setShowCreateDialog(true)} className="gradient-primary text-white w-full md:w-auto" disabled={!canCreateProject}>
            <Plus className="w-4 h-4 mr-2" />
            New Project
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Select
              value={selectedOrgId || 'all'}
              onValueChange={(value) => setSelectedOrgId(value === 'all' ? null : value)}
            >
              <SelectTrigger className="w-full sm:w-[240px]">
                <Building2 className="w-4 h-4 mr-2" />
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
            <Button
              variant="destructive"
              className="w-full sm:w-auto"
              onClick={() => setShowDeleteOrgDialog(true)}
              disabled={!selectedOrgId || !canDeleteSelectedOrganization}
            >
              Delete Org
            </Button>
          </div>
        </div>
      </Card>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
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
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            (() => {
              const projectPermissions = project.organization_id
                ? organizationPermissions.get(project.organization_id)
                : null;

              return (
            <ProjectCard
              key={project.id}
              project={project}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
              canManage={!!projectPermissions?.manageProjects}
              canManageClients={!!projectPermissions?.manageClients}
            />
              );
            })()
          ))}
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
    </div>
  );
};

export default Projects;
