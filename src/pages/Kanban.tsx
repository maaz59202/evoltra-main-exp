import { Spinner } from '@/components/ui/spinner';
import { useEffect, useMemo, useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import KanbanColumn from '@/components/kanban/KanbanColumn';
import { useOrganizationMembers } from '@/hooks/useOrganizationMembers';
import { DEFAULT_COLUMNS, useKanbanColumns } from '@/hooks/useKanbanColumns';
import { Task, useTasks } from '@/hooks/useTasks';
import { useProjects } from '@/hooks/useProjects';
import { cn } from '@/lib/utils';
import {
  ChevronRight,
  Building2,
  FolderOpen,
  LayoutGrid,
  
  Plus,
} from '@/components/ui/icons';
import { toast } from 'sonner';

type DisplayLane = {
  laneId: string;
  dbId: string | null;
  name: string;
  position: number;
  isDefault: boolean;
};

const DEFAULT_COUNT = DEFAULT_COLUMNS.length;
const normalizeLaneName = (value: string) => value.trim().toLowerCase().replace(/\s+/g, ' ');

const Kanban = () => {
  const {
    projects,
    organizations,
    selectedOrgId,
    setSelectedOrgId,
    loading: projectsLoading,
  } = useProjects();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [newColumnName, setNewColumnName] = useState('');
  const [isAddingColumn, setIsAddingColumn] = useState(false);

  const selectedProject = projects.find((project) => project.id === selectedProjectId);
  const { members } = useOrganizationMembers(selectedProject?.organization_id || null);

  useEffect(() => {
    if (selectedProjectId && !projects.some((project) => project.id === selectedProjectId)) {
      setSelectedProjectId(null);
    }
  }, [projects, selectedProjectId]);

  const {
    columns,
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

  const displayLanes = useMemo<DisplayLane[]>(() => {
    if (usingDefaults) {
      return DEFAULT_COLUMNS.map((column) => ({
        laneId: column.id,
        dbId: null,
        name: column.name,
        position: column.position,
        isDefault: true,
      }));
    }

    const matchedColumnIds = new Set<string>();
    const persistedColumnsByName = new Map(
      columns.map((column) => [normalizeLaneName(column.name), column]),
    );
    const persistedColumnsByPosition = new Map(columns.map((column) => [column.position, column]));

    const defaultLanes = DEFAULT_COLUMNS.map((column) => {
      const persistedColumn =
        persistedColumnsByName.get(normalizeLaneName(column.name)) ||
        persistedColumnsByPosition.get(column.position);

      if (persistedColumn) {
        matchedColumnIds.add(persistedColumn.id);
      }

      return {
        laneId: column.id,
        dbId: persistedColumn?.id ?? null,
        name: persistedColumn?.name ?? column.name,
        position: column.position,
        isDefault: true,
      };
    });

    const customLanes = columns
      .filter((column) => !matchedColumnIds.has(column.id))
      .sort((left, right) => left.position - right.position)
      .map((column) => ({
        laneId: column.id,
        dbId: column.id,
        name: column.name,
        position: column.position,
        isDefault: false,
      }));

    return [...defaultLanes, ...customLanes];
  }, [columns, usingDefaults]);

  const visibleTaskCount = useMemo(
    () =>
      displayLanes.reduce((count, lane) => count + getTasksByStatus(lane.laneId).length, 0),
    [displayLanes, getTasksByStatus],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 10,
      },
    }),
  );

  const loading = projectsLoading || tasksLoading || columnsLoading;

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find((item) => item.id === event.active.id);
    if (task) {
      setActiveTask(task);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) {
      return;
    }

    const taskId = active.id as string;
    const task = tasks.find((item) => item.id === taskId);
    if (!task) {
      return;
    }

    const targetLane = displayLanes.find((lane) => lane.laneId === over.id);
    if (!targetLane) {
      return;
    }

    const currentLaneKey = task.column_id || task.status;
    if (currentLaneKey === targetLane.laneId) {
      return;
    }

    const tasksInTargetLane = getTasksByStatus(targetLane.laneId);
    await moveTask(taskId, targetLane.laneId, tasksInTargetLane.length);
  };

  const handleCreateTask = async (title: string, laneId: string) => {
    await createTask(title, laneId);
  };

  const handleUpdateTask = async (
    id: string,
    updates: Partial<Pick<Task, 'title' | 'description' | 'priority' | 'assignee_id'>>,
  ) => {
    await updateTask(id, updates);
  };

  const handleDeleteTask = async (id: string) => {
    await deleteTask(id);
  };

  const handleAddColumn = async () => {
    if (!newColumnName.trim()) {
      return;
    }

    try {
      if (usingDefaults) {
        await initializeDefaultColumns();
      }
      await createColumn(newColumnName.trim());
      setNewColumnName('');
      setIsAddingColumn(false);
      toast.success('Column added to the board');
    } catch (error) {
      console.error('Failed to create column:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to add column');
    }
  };

  const handleUpdateColumn = async (id: string, name: string) => {
    await updateColumn(id, { name });
    toast.success('Column updated');
  };

  const handleDeleteColumn = async (id: string) => {
    await deleteColumn(id);
    toast.success('Column removed');
  };

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-[1380px] flex-col space-y-4">
      <section className="space-y-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
              <span>Workspace</span>
              <ChevronRight className="h-3 w-3" />
              <span>Kanban</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border/50 bg-card/35 text-primary">
                <LayoutGrid className="h-4.5 w-4.5" />
              </div>
                <div className="min-w-0">
                <h1 className="truncate text-[2rem] font-semibold tracking-tight">
                  {selectedProject ? `${selectedProject.name} board` : 'Kanban'}
                </h1>
                </div>
              </div>
              </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="h-7 rounded-full px-2.5 text-xs font-medium">
              {selectedProject ? `Project: ${selectedProject.name}` : 'No project selected'}
            </Badge>
            <Badge variant="outline" className="h-7 rounded-full px-2.5 text-xs font-medium">
              {visibleTaskCount} tasks
            </Badge>
            <Badge variant="outline" className="h-7 rounded-full px-2.5 text-xs font-medium">
              {displayLanes.length} lanes
            </Badge>
          </div>
        </div>

        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row">
            <Select
              value={selectedOrgId || 'all'}
              onValueChange={(value) => setSelectedOrgId(value === 'all' ? null : value)}
            >
              <SelectTrigger className="h-9 w-full min-w-[220px] rounded-lg border-border/60 bg-background md:w-[240px]">
                <Building2 className="mr-2 h-4 w-4" />
                <SelectValue placeholder="All organizations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All organizations</SelectItem>
                {organizations.map((organization) => (
                  <SelectItem key={organization.id} value={organization.id}>
                    {organization.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={selectedProjectId || ''}
              onValueChange={(value) => setSelectedProjectId(value || null)}
            >
              <SelectTrigger className="h-9 w-full min-w-[240px] rounded-lg border-border/60 bg-background md:w-[300px]">
                <FolderOpen className="mr-2 h-4 w-4" />
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
          </div>

          <div className="flex items-center gap-2">
            {selectedProjectId && (
              <Dialog open={isAddingColumn} onOpenChange={setIsAddingColumn}>
                <DialogTrigger asChild>
                  <Button className="h-9 rounded-lg px-3.5 text-sm">
                    <Plus className="mr-1.5 h-4 w-4" />
                    Add Lane
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add a board lane</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="columnName">Lane name</Label>
                      <Input
                        id="columnName"
                        value={newColumnName}
                        onChange={(event) => setNewColumnName(event.target.value)}
                        placeholder="Review, QA, Ready to ship..."
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            void handleAddColumn();
                          }
                        }}
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setIsAddingColumn(false)}>
                        Cancel
                      </Button>
                      <Button onClick={() => void handleAddColumn()} disabled={!newColumnName.trim()}>
                        Add lane
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </section>

      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <Spinner className="h-8 w-8 text-primary" />
        </div>
      ) : !selectedProjectId ? (
        <div className="flex flex-1 items-center justify-center rounded-[24px] border border-dashed border-border/60 bg-card/20 px-4 py-12">
          <div className="max-w-md text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-border/60 bg-card/30">
              <LayoutGrid className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">Pick a project to open the board</h3>
            <p className="mb-6 text-muted-foreground">
              {projects.length === 0
                ? 'Create a project first, then we can turn it into a proper board.'
                : 'Choose a project from the toolbar above to load its lanes and tasks.'}
            </p>
            {projects.length === 0 && (
              <Button asChild>
                <Link to="/projects">Go to Projects</Link>
              </Button>
            )}
          </div>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="min-h-0 flex-1 overflow-hidden rounded-[24px] border border-border/50 bg-card/20">
            <div className="h-full overflow-x-auto overflow-y-hidden px-4 py-4 custom-scrollbar md:px-5">
              <div className="flex h-full min-h-0 w-max min-w-full gap-2.5">
                {displayLanes.map((lane) => (
                  <KanbanColumn
                    key={lane.laneId}
                    id={lane.laneId}
                    dbId={lane.dbId}
                    title={lane.name}
                    tasks={getTasksByStatus(lane.laneId)}
                    members={members}
                    isCustomColumn={!lane.isDefault}
                    onCreateTask={handleCreateTask}
                    onUpdateTask={handleUpdateTask}
                    onDeleteTask={handleDeleteTask}
                    onUpdateColumn={lane.isDefault ? undefined : handleUpdateColumn}
                    onDeleteColumn={lane.isDefault ? undefined : handleDeleteColumn}
                  />
                ))}

                <button
                  type="button"
                  onClick={() => setIsAddingColumn(true)}
                  className={cn(
                    'flex h-fit min-h-[84px] w-[236px] min-w-[236px] flex-none items-center gap-3 self-start rounded-xl border border-dashed border-border/60 bg-card/30 px-3.5 py-3 text-left transition-colors',
                    'hover:border-primary/30 hover:bg-card/55',
                  )}
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/8 text-primary">
                    <Plus className="h-3.5 w-3.5" />
                  </span>
                  <span>
                    <span className="block text-sm font-medium text-foreground">Add another lane</span>
                    <span className="block text-[11px] text-muted-foreground">
                      Append a custom step after the default flow
                    </span>
                  </span>
                </button>
              </div>
            </div>
          </div>

          <DragOverlay>
            {activeTask ? (
              <Card className="border-border/60 bg-card/95 p-2.5 shadow-xl">
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
