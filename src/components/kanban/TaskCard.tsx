import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
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
import { GripVertical, MoreHorizontal, Pencil, Trash2, Check, X, User } from '@/components/ui/icons';
import { Task, TaskPriority } from '@/hooks/useTasks';
import { OrganizationMember } from '@/hooks/useOrganizationMembers';

interface TaskCardProps {
  task: Task;
  members?: OrganizationMember[];
  onUpdate: (id: string, updates: Partial<Pick<Task, 'title' | 'description' | 'priority' | 'assignee_id'>>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const priorityColors: Record<TaskPriority, string> = {
  low: 'bg-muted text-muted-foreground',
  medium: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/20',
  high: 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-500/20 dark:text-rose-400 dark:border-rose-500/20',
};

const TaskCard = ({ task, members = [], onUpdate, onDelete }: TaskCardProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleSave = async () => {
    if (!editTitle.trim() || editTitle === task.title) {
      setIsEditing(false);
      setEditTitle(task.title);
      return;
    }

    setIsLoading(true);
    try {
      await onUpdate(task.id, { title: editTitle.trim() });
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update task:', error);
      setEditTitle(task.title);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      await onDelete(task.id);
    } catch (error) {
      console.error('Failed to delete task:', error);
    } finally {
      setIsLoading(false);
      setShowDeleteDialog(false);
    }
  };

  const handlePriorityChange = async (priority: TaskPriority) => {
    try {
      await onUpdate(task.id, { priority });
    } catch (error) {
      console.error('Failed to update priority:', error);
    }
  };

  const handleAssigneeChange = async (assigneeId: string | null) => {
    try {
      await onUpdate(task.id, { assignee_id: assigneeId });
    } catch (error) {
      console.error('Failed to update assignee:', error);
    }
  };

  const assignee = members.find(m => m.user_id === task.assignee_id);

  const getInitials = (name: string | null | undefined) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <>
      <Card
        ref={setNodeRef}
        style={style}
        className="group rounded-lg border border-border/50 bg-background/70 p-2.5 shadow-none transition-all hover:border-border hover:bg-background/85 hover:shadow-sm"
      >
        <div className="flex items-start gap-2">
          <div
            {...attributes}
            {...listeners}
            className="mt-0.5 cursor-grab touch-none text-muted-foreground/70 opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100 active:cursor-grabbing"
          >
            <GripVertical className="h-3.5 w-3.5" />
          </div>

          <div className="flex-1 min-w-0">
            {isEditing ? (
              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="h-7 text-sm"
                  autoFocus
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === 'Enter') handleSave();
                    if (e.key === 'Escape') {
                      setIsEditing(false);
                      setEditTitle(task.title);
                    }
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                />
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="h-7 w-7 rounded-md" 
                  onClick={(e) => { e.stopPropagation(); handleSave(); }} 
                  disabled={isLoading}
                >
                  <Check className="w-3 h-3" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 rounded-md"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditing(false);
                    setEditTitle(task.title);
                  }}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ) : (
              <p className="truncate text-[13px] font-medium leading-5 text-foreground/95">{task.title}</p>
            )}

            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {task.priority && !isEditing && (
                <Badge
                  variant="outline"
                  className={`h-5 rounded-md px-1.5 text-[10px] font-medium uppercase tracking-[0.08em] ${priorityColors[task.priority]}`}
                >
                  {task.priority}
                </Badge>
              )}
               
              {assignee && (
                <div className="flex items-center gap-1.5 rounded-md bg-background/50 px-1.5 py-1">
                  <Avatar className="h-4.5 w-4.5">
                    <AvatarImage src={assignee.profile?.avatar_url || undefined} />
                    <AvatarFallback className="text-[9px]">
                      {getInitials(assignee.profile?.full_name || assignee.profile?.email)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="max-w-[72px] truncate text-[11px] text-muted-foreground">
                    {assignee.profile?.full_name || assignee.profile?.email || 'Unknown'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {!isEditing && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 rounded-md opacity-0 transition-opacity group-hover:opacity-100"
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onPointerDown={(e) => e.stopPropagation()}>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}>
                  <Pencil className="w-4 h-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <User className="w-4 h-4 mr-2" />
                    Assign to
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem onClick={() => handleAssigneeChange(null)}>
                      <span className="text-muted-foreground">Unassigned</span>
                    </DropdownMenuItem>
                    {members.map((member) => (
                      <DropdownMenuItem 
                        key={member.id} 
                        onClick={() => handleAssigneeChange(member.user_id)}
                      >
                        <Avatar className="h-5 w-5 mr-2">
                          <AvatarImage src={member.profile?.avatar_url || undefined} />
                          <AvatarFallback className="text-[10px]">
                            {getInitials(member.profile?.full_name || member.profile?.email)}
                          </AvatarFallback>
                        </Avatar>
                        {member.profile?.full_name || member.profile?.email || 'Unknown'}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                
                <DropdownMenuSeparator />
                
                <DropdownMenuItem onClick={() => handlePriorityChange('low')}>
                  Set Low Priority
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handlePriorityChange('medium')}>
                  Set Medium Priority
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handlePriorityChange('high')}>
                  Set High Priority
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                
                <DropdownMenuItem
                  onClick={(e) => { e.stopPropagation(); setShowDeleteDialog(true); }}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{task.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.stopPropagation(); handleDelete(); }}
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

export default TaskCard;
