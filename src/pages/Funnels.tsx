import { Spinner } from '@/components/ui/spinner';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFunnels } from '@/hooks/useFunnels';
import { useSubscription } from '@/hooks/useSubscription';
import { useProjects } from '@/hooks/useProjects';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Edit, ExternalLink, MoreVertical,  Lock, FileText, Sparkles, UserPlus, Megaphone, PartyPopper, ArrowLeft } from '@/components/ui/icons';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { funnelTemplates, FunnelTemplate } from '@/data/funnelTemplates';
import { Widget } from '@/types/funnel';
import { ROLE_PERMISSIONS } from '@/data/productCopy';

const Funnels = () => {
  const navigate = useNavigate();
  const { funnels, isLoading, deleteFunnel, createFunnel, isCreating, isDeleting } = useFunnels();
  const { isSolo, loading: subscriptionLoading } = useSubscription();
  const { organizations, selectedOrgId } = useProjects();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<FunnelTemplate | null>(null);
  const [newFunnelName, setNewFunnelName] = useState('');
  const manageableOrganizations = organizations.filter(
    (organization) => organization.role && ROLE_PERMISSIONS[organization.role].manageFunnels
  );
  const createOrganizationId =
    selectedOrgId && manageableOrganizations.some((organization) => organization.id === selectedOrgId)
      ? selectedOrgId
      : manageableOrganizations[0]?.id || null;
  const selectedOrganization = organizations.find((organization) => organization.id === createOrganizationId) || null;
  const selectedPermissions = selectedOrganization?.role ? ROLE_PERMISSIONS[selectedOrganization.role] : null;
  const visibleFunnels = selectedOrgId
    ? funnels.filter((funnel) => funnel.workspaceId === selectedOrgId)
    : funnels;
  const createOrgFunnelsCount = createOrganizationId
    ? funnels.filter((funnel) => funnel.workspaceId === createOrganizationId).length
    : 0;
  const soloLimitReached = !subscriptionLoading && isSolo && createOrgFunnelsCount >= 1;

  const handleDelete = async () => {
    if (deleteId) {
      await deleteFunnel(deleteId);
      setDeleteId(null);
    }
  };

  const handleOpenCreateDialog = () => {
    if (!selectedPermissions?.manageFunnels) {
      toast.error('Only workspace owners and admins can create funnels.');
      return;
    }
    if (soloLimitReached) {
      toast.error('Solo plan is limited to 1 funnel. Upgrade to Team for unlimited funnels.', {
        action: {
          label: 'Upgrade',
          onClick: () => navigate('/pricing'),
        },
      });
      return;
    }
    setSelectedTemplate(null);
    setNewFunnelName('');
    setShowCreateDialog(true);
  };

  const handleCreateNew = async () => {
    if (!newFunnelName.trim() || !createOrganizationId || !selectedTemplate || !selectedPermissions?.manageFunnels) return;
    
    // Generate fresh widget IDs for the template
    const templateWidgets = selectedTemplate.widgets.length > 0 
      ? regenerateWidgetIds(selectedTemplate.widgets)
      : [];

    const newFunnel = await createFunnel({ 
      name: newFunnelName.trim(), 
      organizationId: createOrganizationId,
      widgets: templateWidgets,
    });
    
    setShowCreateDialog(false);
    setNewFunnelName('');
    setSelectedTemplate(null);
    navigate(`/funnel/${newFunnel.id}`);
  };

  // Regenerate IDs so each funnel gets unique widget IDs
  const regenerateWidgetIds = (widgets: Widget[]): Widget[] => {
    const idMap = new Map<string, string>();
    widgets.forEach(w => {
      idMap.set(w.id, crypto.randomUUID());
    });
    return widgets.map(w => ({
      ...w,
      id: idMap.get(w.id) || crypto.randomUUID(),
      parentId: w.parentId ? (idMap.get(w.parentId) || w.parentId) : null,
    }));
  };

  const templateIcons: Record<string, React.ReactNode> = {
    FileText: <FileText className="w-6 h-6" />,
    Sparkles: <Sparkles className="w-6 h-6" />,
    UserPlus: <UserPlus className="w-6 h-6" />,
    Megaphone: <Megaphone className="w-6 h-6" />,
    PartyPopper: <PartyPopper className="w-6 h-6" />,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Funnels</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage your landing pages and funnels
          </p>
        </div>
        <div className="flex items-center gap-3">
          {!subscriptionLoading && isSolo && (
            <Badge variant="secondary" className="gap-1">
              <Lock className="w-3 h-3" />
              {createOrgFunnelsCount}/1 Funnel
            </Badge>
          )}
          <Button
            onClick={handleOpenCreateDialog}
            disabled={subscriptionLoading || !createOrganizationId || !selectedPermissions?.manageFunnels}
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Funnel
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner className="w-8 h-8 text-muted-foreground" />
        </div>
      ) : visibleFunnels.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Plus className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">No funnels yet</h3>
            <p className="text-muted-foreground text-center mb-4 max-w-md">
              Create your first funnel to start building landing pages for lead capture and conversions.
            </p>
            <Button
              onClick={handleOpenCreateDialog}
              disabled={subscriptionLoading || !createOrganizationId || !selectedPermissions?.manageFunnels}
            >
              <Plus className="w-4 h-4 mr-2" />
              {selectedPermissions?.manageFunnels ? 'Create Your First Funnel' : 'No funnels available'}
            </Button>
            {!createOrganizationId && (
              <p className="text-sm text-destructive mt-2">
                You need to be part of an organization to create funnels.
              </p>
            )}
            {createOrganizationId && !selectedPermissions?.manageFunnels && (
              <p className="text-sm text-muted-foreground mt-2">
                You can view funnels in this workspace, but only owners and admins can create them.
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visibleFunnels.map((funnel) => {
            const funnelOrganization = organizations.find((organization) => organization.id === funnel.workspaceId) || null;
            const funnelPermissions = funnelOrganization?.role ? ROLE_PERMISSIONS[funnelOrganization.role] : null;

            return (
            <Card key={funnel.id} className="group hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{funnel.name}</CardTitle>
                    <CardDescription>
                      Updated {format(new Date(funnel.updatedAt), 'MMM d, yyyy')}
                    </CardDescription>
                  </div>
                  {funnelPermissions?.manageFunnels && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => navigate(`/funnel/${funnel.id}`)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      {funnel.status === 'published' && funnel.publishedUrl && (
                        <DropdownMenuItem onClick={() => window.open(funnel.publishedUrl, '_blank')}>
                          <ExternalLink className="w-4 h-4 mr-2" />
                          View Live
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem 
                        onClick={() => setDeleteId(funnel.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <Badge variant={funnel.status === 'published' ? 'default' : 'secondary'}>
                    {funnel.status}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {funnel.widgets.length} widgets
                  </span>
                </div>
                
                <div className="mt-4 pt-4 border-t border-border flex gap-2">
                  {funnelPermissions?.manageFunnels ? (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                        onClick={() => navigate(`/funnel/${funnel.id}`)}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                  ) : (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => window.open(funnel.publishedUrl || `/f/${funnel.id}`, '_blank')}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View
                    </Button>
                  )}
                  {funnel.status === 'published' && funnel.publishedUrl && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => window.open(funnel.publishedUrl, '_blank')}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
            );
          })}
        </div>
      )}

      {/* Create Funnel Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedTemplate ? (
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedTemplate(null)}>
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                  Create from "{selectedTemplate.name}"
                </div>
              ) : (
                'Choose a Template'
              )}
            </DialogTitle>
            <DialogDescription>
              {selectedTemplate
                ? 'Give your funnel a name to get started.'
                : 'Pick a pre-built template or start from scratch.'}
            </DialogDescription>
          </DialogHeader>

          {!selectedTemplate ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 py-4">
              {funnelTemplates.map((tpl) => (
                <button
                  key={tpl.id}
                  onClick={() => setSelectedTemplate(tpl)}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border hover:border-primary hover:bg-accent/50 transition-all text-center group"
                >
                  <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center text-muted-foreground group-hover:text-primary group-hover:bg-primary/10 transition-colors">
                    {templateIcons[tpl.icon] || <FileText className="w-6 h-6" />}
                  </div>
                  <span className="font-medium text-sm">{tpl.name}</span>
                  <span className="text-xs text-muted-foreground leading-tight">{tpl.description}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="py-4">
              <Label htmlFor="funnel-name">Funnel Name</Label>
              <Input
                id="funnel-name"
                value={newFunnelName}
                onChange={(e) => setNewFunnelName(e.target.value)}
                placeholder={`e.g., My ${selectedTemplate.name}`}
                className="mt-2"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateNew();
                }}
              />
            </div>
          )}

          {selectedTemplate && (
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateNew}
                disabled={!newFunnelName.trim() || isCreating}
              >
                {isCreating ? (
                  <>
                    <Spinner className="w-4 h-4 mr-2" />
                    Creating...
                  </>
                ) : (
                  'Create Funnel'
                )}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Funnel</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this funnel? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              className="bg-destructive text-destructive-foreground"
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Funnels;
