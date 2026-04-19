import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { MoreVertical, Pencil, Trash2, FolderOpen, Check, X, UserPlus } from '@/components/ui/icons';
import { Project } from '@/hooks/useProjects';
import { format } from 'date-fns';
import InviteClientDialog from './InviteClientDialog';

interface ProjectCardProps {
  project: Project;
  onUpdate: (id: string, updates: Partial<Pick<Project, 'name' | 'status'>>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  canManage: boolean;
  canManageClients: boolean;
}

const statusColors: Record<string, string> = {
  active: 'bg-success/20 text-success border-success/30',
  paused: 'bg-warning/20 text-warning border-warning/30',
  completed: 'bg-primary/20 text-primary border-primary/30',
  archived: 'bg-muted text-muted-foreground border-muted',
};

const ProjectCard = ({ project, onUpdate, onDelete, canManage, canManageClients }: ProjectCardProps) => {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(project.name);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking on buttons, inputs, or dropdown
    const target = e.target as HTMLElement;
    if (
      target.closest('button') ||
      target.closest('input') ||
      target.closest('[role="menu"]') ||
      target.closest('[data-radix-popper-content-wrapper]')
    ) {
      return;
    }
    navigate(`/project/${project.id}`);
  };

  const handleSave = async () => {
    if (!editName.trim() || editName === project.name) {
      setIsEditing(false);
      setEditName(project.name);
      return;
    }

    setIsLoading(true);
    try {
      await onUpdate(project.id, { name: editName.trim() });
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update project:', error);
      setEditName(project.name);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      await onDelete(project.id);
    } catch (error) {
      console.error('Failed to delete project:', error);
    } finally {
      setIsLoading(false);
      setShowDeleteDialog(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    setIsLoading(true);
    try {
      await onUpdate(project.id, { status: newStatus });
    } catch (error) {
      console.error('Failed to update status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Card 
        className="group cursor-pointer rounded-[24px] border-border/60 bg-card/72 shadow-[0_14px_40px_rgba(2,6,23,0.08)] transition-all duration-200 hover:border-border hover:shadow-[0_18px_48px_rgba(2,6,23,0.12)]"
        onClick={handleCardClick}
      >
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border border-border/60 bg-background/60 text-muted-foreground">
              <FolderOpen className="w-5 h-5" />
            </div>
            {isEditing ? (
              <div className="flex items-center gap-2 flex-1">
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="h-8"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSave();
                    if (e.key === 'Escape') {
                      setIsEditing(false);
                      setEditName(project.name);
                    }
                  }}
                />
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleSave} disabled={isLoading}>
                  <Check className="w-4 h-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => {
                    setIsEditing(false);
                    setEditName(project.name);
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <h3 className="font-semibold truncate">{project.name}</h3>
            )}
          </div>
          
          {!isEditing && canManage && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsEditing(true)}>
                  <Pencil className="w-4 h-4 mr-2" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStatusChange('active')}>
                  Set Active
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStatusChange('paused')}>
                  Set Paused
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStatusChange('completed')}>
                  Set Completed
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStatusChange('archived')}>
                  Archive
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Badge variant="outline" className={`rounded-full ${statusColors[project.status || 'active']}`}>
              {project.status || 'active'}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {project.created_at && format(new Date(project.created_at), 'MMM d, yyyy')}
            </span>
          </div>
          {canManageClients && (
            <Button
              variant="outline"
              size="sm"
              className="h-10 w-full rounded-xl border-border/60 bg-background/40"
              onClick={(e) => {
                e.stopPropagation();
                setShowInviteDialog(true);
              }}
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Invite Client
            </Button>
          )}
        </CardContent>
      </Card>

      {canManageClients && (
        <InviteClientDialog
          open={showInviteDialog}
          onOpenChange={setShowInviteDialog}
          projectId={project.id}
          projectName={project.name}
        />
      )}

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{project.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isLoading}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ProjectCard;
