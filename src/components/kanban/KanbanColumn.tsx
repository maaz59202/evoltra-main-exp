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
import { Plus, X, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import TaskCard from './TaskCard';
import { Task, TaskPriority } from '@/hooks/useTasks';
import { OrganizationMember } from '@/hooks/useOrganizationMembers';

interface KanbanColumnProps {
  id: string;
  title: string;
  tasks: Task[];
  members?: OrganizationMember[];
  isCustomColumn?: boolean;
  onCreateTask: (title: string, columnId: string) => Promise<void>;
  onUpdateTask: (id: string, updates: Partial<Pick<Task, 'title' | 'description' | 'priority' | 'assignee_id'>>) => Promise<void>;
  onDeleteTask: (id: string) => Promise<void>;
  onUpdateColumn?: (id: string, name: string) => Promise<void>;
  onDeleteColumn?: (id: string) => Promise<void>;
}

const columnColors: Record<string, string> = {
  backlog: 'border-t-muted-foreground',
  todo: 'border-t-primary',
  in_progress: 'border-t-warning',
  done: 'border-t-success',
};

const KanbanColumn = ({
  id,
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

  const borderColor = columnColors[id] || 'border-t-primary';

  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) return;

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

    setIsLoading(true);
    try {
      await onUpdateColumn(id, editColumnName.trim());
      setIsEditingColumn(false);
    } catch (error) {
      console.error('Failed to update column:', error);
      setEditColumnName(title);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteColumn = async () => {
    if (!onDeleteColumn) return;
    
    setIsLoading(true);
    try {
      await onDeleteColumn(id);
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
        className={`flex-shrink-0 w-[85vw] max-w-[320px] sm:w-[320px] border-t-4 bg-card/80 ${borderColor} ${
          isOver ? 'ring-2 ring-primary/50' : ''
        }`}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            {isEditingColumn ? (
              <div className="flex items-center gap-1 flex-1">
                <Input
                  value={editColumnName}
                  onChange={(e) => setEditColumnName(e.target.value)}
                  className="h-7 text-sm"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveColumnName();
                    if (e.key === 'Escape') {
                      setIsEditingColumn(false);
                      setEditColumnName(title);
                    }
                  }}
                />
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleSaveColumnName}>
                  <Plus className="w-3 h-3 rotate-45" />
                </Button>
              </div>
            ) : (
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                {title}
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  {tasks.length}
                </span>
              </CardTitle>
            )}
            
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setIsAddingTask(true)}
              >
                <Plus className="w-4 h-4" />
              </Button>
              
              {isCustomColumn && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setIsEditingColumn(true)}>
                      <Pencil className="w-4 h-4 mr-2" />
                      Rename
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
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-2 min-h-[460px]">
          {isAddingTask && (
            <div className="space-y-2">
              <Input
                placeholder="Task title..."
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddTask();
                  if (e.key === 'Escape') {
                    setIsAddingTask(false);
                    setNewTaskTitle('');
                  }
                }}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAddTask} disabled={isLoading || !newTaskTitle.trim()}>
                  Add
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setIsAddingTask(false);
                    setNewTaskTitle('');
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
            {tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                members={members}
                onUpdate={onUpdateTask}
                onDelete={onDeleteTask}
              />
            ))}
          </SortableContext>

          {tasks.length === 0 && !isAddingTask && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No tasks
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Column</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{title}"? Tasks in this column will become unassigned.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteColumn}
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
