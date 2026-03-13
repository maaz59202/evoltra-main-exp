import { useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import KanbanColumn from '@/components/kanban/KanbanColumn';
import { useTasks, Task } from '@/hooks/useTasks';
import { useProjects } from '@/hooks/useProjects';
import { useOrganizationMembers } from '@/hooks/useOrganizationMembers';
import { useKanbanColumns, DEFAULT_COLUMNS } from '@/hooks/useKanbanColumns';
import { Loader2, LayoutGrid, FolderOpen, Plus } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';

const Kanban = () => {
  const { projects, loading: projectsLoading } = useProjects();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [newColumnName, setNewColumnName] = useState('');
  const [isAddingColumn, setIsAddingColumn] = useState(false);

  // Get selected project's organization
  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const { members } = useOrganizationMembers(selectedProject?.organization_id || null);
  
  const {
    columns: customColumns,
    loading: columnsLoading,
    usingDefaults,
    createColumn,
    updateColumn,
    deleteColumn,
    initializeDefaultColumns,
  } = useKanbanColumns(selectedProjectId);

  const {
    tasks,
    loading: tasksLoading,
    createTask,
    updateTask,
    deleteTask,
    moveTask,
    getTasksByStatus,
  } = useTasks(selectedProjectId);

  // Determine which columns to display - all columns are editable
  const displayColumns = usingDefaults 
    ? DEFAULT_COLUMNS.map(c => ({ ...c, dbId: null as string | null }))
    : customColumns.map(c => ({ id: c.id, name: c.name, position: c.position, dbId: c.id }));

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 10,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find(t => t.id === event.active.id);
    if (task) setActiveTask(task);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const taskId = active.id as string;
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    // Check if dropped on a column
    const targetColumn = displayColumns.find(c => c.id === over.id);
    
    if (targetColumn) {
      const newStatus = targetColumn.id;
      if (newStatus !== task.status) {
        const tasksInNewColumn = getTasksByStatus(newStatus);
        const newPosition = tasksInNewColumn.length;
        await moveTask(taskId, newStatus as any, newPosition);
      }
    }
  };

  const handleCreateTask = async (title: string, columnId: string) => {
    await createTask(title, columnId as any);
  };

  const handleUpdateTask = async (id: string, updates: Partial<Pick<Task, 'title' | 'description' | 'priority' | 'assignee_id'>>) => {
    await updateTask(id, updates);
  };

  const handleDeleteTask = async (id: string) => {
    await deleteTask(id);
  };

  const handleAddColumn = async () => {
    if (!newColumnName.trim()) return;
    
    try {
      if (usingDefaults) {
        // Initialize with default columns first, then add the new one
        await initializeDefaultColumns();
      }
      await createColumn(newColumnName.trim());
      setNewColumnName('');
      setIsAddingColumn(false);
    } catch (error) {
      console.error('Failed to create column:', error);
    }
  };

  const handleUpdateColumn = async (id: string, name: string) => {
    // If using defaults, initialize columns first
    if (usingDefaults) {
      const initializedColumns = await initializeDefaultColumns();
      // Find the corresponding column by position/name and update it
      const matchingColumn = initializedColumns?.find(c => 
        DEFAULT_COLUMNS.find(dc => dc.id === id)?.name === c.name
      );
      if (matchingColumn) {
        await updateColumn(matchingColumn.id, { name });
      }
    } else {
      await updateColumn(id, { name });
    }
  };

  const handleDeleteColumn = async (id: string) => {
    // If using defaults, initialize columns first
    if (usingDefaults) {
      const initializedColumns = await initializeDefaultColumns();
      // Find the corresponding column by position/name and delete it
      const matchingColumn = initializedColumns?.find(c => 
        DEFAULT_COLUMNS.find(dc => dc.id === id)?.name === c.name
      );
      if (matchingColumn) {
        await deleteColumn(matchingColumn.id);
      }
    } else {
      await deleteColumn(id);
    }
  };

  const loading = projectsLoading || tasksLoading || columnsLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <LayoutGrid className="w-8 h-8" />
            Kanban Board
          </h1>
          <p className="text-muted-foreground mt-1">
            Drag and drop tasks to manage your workflow
          </p>
          {selectedProject && (
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">Project: {selectedProject.name}</Badge>
              <Badge variant="outline">{tasks.length} tasks</Badge>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 w-full lg:w-auto">
          <Select
            value={selectedProjectId || ''}
            onValueChange={(value) => setSelectedProjectId(value || null)}
          >
            <SelectTrigger className="w-full lg:w-[280px]">
              <FolderOpen className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Select a project" />
            </SelectTrigger>
            <SelectContent>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedProjectId && (
            <Dialog open={isAddingColumn} onOpenChange={setIsAddingColumn}>
              <DialogTrigger asChild>
                <Button variant="outline" size="icon" className="shrink-0">
                  <Plus className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Column</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="columnName">Column Name</Label>
                    <Input
                      id="columnName"
                      value={newColumnName}
                      onChange={(e) => setNewColumnName(e.target.value)}
                      placeholder="e.g., Review, Testing..."
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddColumn();
                      }}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsAddingColumn(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddColumn} disabled={!newColumnName.trim()}>
                      Add Column
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : !selectedProjectId ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <LayoutGrid className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Select a Project</h3>
          <p className="text-muted-foreground mb-6">
            {projects.length === 0
              ? 'Create a project first to use the Kanban board'
              : 'Choose a project from the dropdown above to view tasks'}
          </p>
          {projects.length === 0 && (
            <Button asChild>
              <Link to="/projects">Go to Projects</Link>
            </Button>
          )}
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="rounded-xl border border-border/60 bg-card/30 p-3 md:p-4">
            <div className="flex gap-4 overflow-x-auto pb-2">
            {displayColumns.map((column) => (
              <KanbanColumn
                key={column.id}
                id={column.id}
                title={column.name}
                tasks={getTasksByStatus(column.id)}
                members={members}
                isCustomColumn={true}
                onCreateTask={handleCreateTask}
                onUpdateTask={handleUpdateTask}
                onDeleteTask={handleDeleteTask}
                onUpdateColumn={handleUpdateColumn}
                onDeleteColumn={handleDeleteColumn}
              />
            ))}
            </div>
          </div>

          <DragOverlay>
            {activeTask ? (
              <Card className="p-3 bg-card shadow-lg rotate-3">
                <p className="text-sm font-medium">{activeTask.title}</p>
              </Card>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
};

export default Kanban;
