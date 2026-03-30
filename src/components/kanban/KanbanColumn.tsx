import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { MoreHorizontal, Pencil, Plus, Trash2, X } from 'lucide-react';
import TaskCard from './TaskCard';
import { OrganizationMember } from '@/hooks/useOrganizationMembers';
import { Task } from '@/hooks/useTasks';
import { cn } from '@/lib/utils';

interface KanbanColumnProps {
  id: string;
  dbId?: string | null;
  title: string;
  tasks: Task[];
  members?: OrganizationMember[];
  isCustomColumn?: boolean;
  onCreateTask: (title: string, columnId: string) => Promise<void>;
  onUpdateTask: (
    id: string,
    updates: Partial<Pick<Task, 'title' | 'description' | 'priority' | 'assignee_id'>>,
  ) => Promise<void>;
  onDeleteTask: (id: string) => Promise<void>;
  onUpdateColumn?: (id: string, name: string) => Promise<void>;
  onDeleteColumn?: (id: string) => Promise<void>;
}

const laneAccent: Record<string, string> = {
  backlog: 'bg-slate-300/80',
  todo: 'bg-violet-400/90',
  in_progress: 'bg-amber-400/90',
  done: 'bg-emerald-400/90',
};

const KanbanColumn = ({
  id,
  dbId,
  title,
  tasks,
  members = [],
  isCustomColumn = false,
  onCreateTask,
  onUpdateTask,
  onDeleteTask,
  onUpdateColumn,
  onDeleteColumn,
}: KanbanColumnProps) => {
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isEditingColumn, setIsEditingColumn] = useState(false);
  const [editColumnName, setEditColumnName] = useState(title);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const { setNodeRef, isOver } = useDroppable({ id });

  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) {
      return;
    }

    setIsLoading(true);
    try {
      await onCreateTask(newTaskTitle.trim(), id);
      setNewTaskTitle('');
      setIsAddingTask(false);
    } catch (error) {
      console.error('Failed to create task:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveColumnName = async () => {
    if (!editColumnName.trim() || editColumnName === title || !onUpdateColumn) {
      setIsEditingColumn(false);
      setEditColumnName(title);
      return;
    }

    const targetColumnId = dbId || id;

    setIsLoading(true);
    try {
      await onUpdateColumn(targetColumnId, editColumnName.trim());
      setIsEditingColumn(false);
    } catch (error) {
      console.error('Failed to update column:', error);
      setEditColumnName(title);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteColumn = async () => {
    if (!onDeleteColumn) {
      return;
    }

    const targetColumnId = dbId || id;

    setIsLoading(true);
    try {
      await onDeleteColumn(targetColumnId);
    } catch (error) {
      console.error('Failed to delete column:', error);
    } finally {
      setIsLoading(false);
      setShowDeleteDialog(false);
    }
  };

  return (
    <>
      <Card
        ref={setNodeRef}
        className={cn(
          'flex h-full max-h-full w-[264px] min-w-[264px] flex-none flex-col overflow-hidden rounded-xl border border-border/50 bg-card/92 shadow-[0_1px_0_rgba(255,255,255,0.03)] backdrop-blur',
          isOver && 'ring-2 ring-primary/50',
        )}
      >
        <div className={cn('h-1 w-full', laneAccent[id] || 'bg-primary/70')} />

        <CardHeader className="space-y-0 px-3 py-2.5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              {isEditingColumn ? (
                <div className="flex items-center gap-1">
                  <Input
                    value={editColumnName}
                    onChange={(event) => setEditColumnName(event.target.value)}
                    className="h-8"
                    autoFocus
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        void handleSaveColumnName();
                      }
                      if (event.key === 'Escape') {
                        setIsEditingColumn(false);
                        setEditColumnName(title);
                      }
                    }}
                  />
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => void handleSaveColumnName()}>
                    <Plus className="h-4 w-4 rotate-45" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <CardTitle className="truncate text-[13px] font-semibold uppercase tracking-[0.12em] text-foreground/90">
                    {title}
                  </CardTitle>
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-background/80 px-1.5 text-[11px] font-medium text-muted-foreground">
                    {tasks.length}
                  </span>
                </div>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-md text-muted-foreground hover:bg-background/70 hover:text-foreground"
                onClick={() => setIsAddingTask(true)}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>

              {isCustomColumn && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 rounded-md text-muted-foreground hover:bg-background/70 hover:text-foreground"
                    >
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setIsEditingColumn(true)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setShowDeleteDialog(true)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex min-h-0 flex-1 flex-col gap-2.5 px-3 pb-3 pt-0">
          {isAddingTask ? (
            <div className="space-y-2 rounded-lg border border-border/60 bg-background/75 p-2.5">
              <Input
                placeholder="What needs to happen?"
                value={newTaskTitle}
                onChange={(event) => setNewTaskTitle(event.target.value)}
                autoFocus
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    void handleAddTask();
                  }
                  if (event.key === 'Escape') {
                    setIsAddingTask(false);
                    setNewTaskTitle('');
                  }
                }}
              />
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={() => void handleAddTask()} disabled={isLoading || !newTaskTitle.trim()}>
                  Add task
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setIsAddingTask(false);
                    setNewTaskTitle('');
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsAddingTask(true)}
              className="flex items-center gap-2 rounded-lg border border-transparent px-2 py-1.5 text-[13px] text-muted-foreground transition-colors hover:border-border/60 hover:bg-background/55 hover:text-foreground"
            >
              <Plus className="h-3.5 w-3.5" />
              Add task
            </button>
          )}

          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            <SortableContext items={tasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {tasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    members={members}
                    onUpdate={onUpdateTask}
                    onDelete={onDeleteTask}
                  />
                ))}
              </div>
            </SortableContext>
          </div>

          {tasks.length === 0 && !isAddingTask && (
            <div className="rounded-lg border border-dashed border-border/60 bg-background/35 px-3 py-6 text-center text-[13px] text-muted-foreground">
              Nothing here yet
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete lane</AlertDialogTitle>
            <AlertDialogDescription>
              This removes "{title}" from the board. Existing tasks in that lane will no longer be reachable until
              they are reassigned in the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleDeleteColumn()}
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

export default KanbanColumn;
