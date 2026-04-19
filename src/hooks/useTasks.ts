import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface Task {
  id: string;
  project_id: string | null;
  column_id: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority | null;
  assignee_id: string | null;
  position: number;
  created_at: string | null;
  updated_at: string | null;
}

export const COLUMNS: { id: TaskStatus; title: string }[] = [
  { id: 'backlog', title: 'Backlog' },
  { id: 'todo', title: 'To Do' },
  { id: 'in_progress', title: 'In Progress' },
  { id: 'done', title: 'Done' },
];

// Check if a status string is a valid default status
const isDefaultStatus = (status: string): status is TaskStatus => {
  return ['backlog', 'todo', 'in_progress', 'done'].includes(status);
};

export const useTasks = (projectId: string | null) => {
  const { user, profile } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    if (!user || !projectId) {
      setTasks([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', projectId)
        .order('position', { ascending: true });

      if (error) throw error;
      setTasks((data as Task[]) || []);
    } catch (err) {
      console.error('Error fetching tasks:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  }, [user?.id, projectId]);

  const createTask = async (title: string, statusOrColumnId: string = 'backlog') => {
    if (!user || !projectId) throw new Error('Must be logged in with a project selected');

    // Determine if this is a default status or a custom column UUID
    const isDefault = isDefaultStatus(statusOrColumnId);
    const status = isDefault ? statusOrColumnId : statusOrColumnId; // Use the column ID as status for filtering
    
    // For position calculation, filter by column_id for custom columns or status for defaults
    const tasksInColumn = isDefault 
      ? tasks.filter(t => t.status === status && !t.column_id)
      : tasks.filter(t => t.column_id === statusOrColumnId);
    
    const maxPosition = tasksInColumn.length > 0 
      ? Math.max(...tasksInColumn.map(t => t.position)) + 1 
      : 0;

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        project_id: projectId,
        title,
        status: isDefault ? status : 'backlog', // Default status for custom columns
        position: maxPosition,
        column_id: isDefault ? null : statusOrColumnId,
      })
      .select()
      .single();

    if (error) throw error;
    
    // Add to state immediately for instant UI feedback
    const newTask = data as Task;
    setTasks(prev => [...prev, newTask]);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.access_token) {
      const { error: emailError } = await supabase.functions.invoke('send-activity-email', {
        body: {
          type: 'project_update',
          projectId,
          message: `New task added: "${title.trim()}".`,
          senderName: profile?.full_name || user.email || 'Your team',
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (emailError) {
        console.warn('Task creation email notification failed:', emailError);
      }
    }
    
    return newTask;
  };

  const updateTask = async (id: string, updates: Partial<Pick<Task, 'title' | 'description' | 'status' | 'priority' | 'position' | 'assignee_id'>>) => {
    if (!user) throw new Error('Must be logged in');

    const existingTask = tasks.find((task) => task.id === id);

    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.access_token && existingTask) {
      const label = updates.title
        ? `Task renamed to "${updates.title}".`
        : `Task updated: "${existingTask.title}".`;

      const { error: emailError } = await supabase.functions.invoke('send-activity-email', {
        body: {
          type: 'project_update',
          projectId,
          message: label,
          senderName: profile?.full_name || user.email || 'Your team',
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (emailError) {
        console.warn('Task update email notification failed:', emailError);
      }
    }

    setTasks(prev => prev.map(t => t.id === id ? (data as Task) : t));
    return data as Task;
  };

  const deleteTask = async (id: string) => {
    if (!user) throw new Error('Must be logged in');

    const existingTask = tasks.find((task) => task.id === id);

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id);

    if (error) throw error;
    setTasks(prev => prev.filter(t => t.id !== id));

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.access_token && existingTask) {
      const { error: emailError } = await supabase.functions.invoke('send-activity-email', {
        body: {
          type: 'project_update',
          projectId,
          message: `Task removed: "${existingTask.title}".`,
          senderName: profile?.full_name || user.email || 'Your team',
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (emailError) {
        console.warn('Task delete email notification failed:', emailError);
      }
    }
  };

  const moveTask = async (taskId: string, newStatusOrColumnId: string, newPosition: number) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const isDefault = isDefaultStatus(newStatusOrColumnId);
    const currentColumnKey = task.column_id || task.status;

    if (currentColumnKey === newStatusOrColumnId && task.position === newPosition) {
      return;
    }
    
    // Optimistic update
    setTasks(prev => {
      const updated = prev.map(t => {
        if (t.id === taskId) {
          if (isDefault) {
            return { ...t, status: newStatusOrColumnId as TaskStatus, column_id: null, position: newPosition };
          } else {
            return { ...t, column_id: newStatusOrColumnId, position: newPosition };
          }
        }
        return t;
      });
      return updated;
    });

    try {
      const updateData = isDefault
        ? { status: newStatusOrColumnId, column_id: null, position: newPosition }
        : { column_id: newStatusOrColumnId, position: newPosition };
        
      await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', taskId);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.access_token) {
        const targetLabel = isDefault
          ? COLUMNS.find((column) => column.id === newStatusOrColumnId)?.title || 'a new lane'
          : 'a custom lane';

        const { error: emailError } = await supabase.functions.invoke('send-activity-email', {
          body: {
            type: 'project_update',
            projectId,
            message: `Task moved: "${task.title}" is now in ${targetLabel}.`,
            senderName: profile?.full_name || user.email || 'Your team',
          },
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (emailError) {
          console.warn('Task move email notification failed:', emailError);
        }
      }
    } catch (err) {
      console.error('Error moving task:', err);
      // Revert on error
      fetchTasks();
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Filter tasks by column - supports both default status strings and custom column UUIDs
  const getTasksByStatus = (statusOrColumnId: string) => {
    const isDefault = isDefaultStatus(statusOrColumnId);
    return tasks
      .filter(t => {
        if (isDefault) {
          // For default columns, match by status and no custom column_id
          return t.status === statusOrColumnId && !t.column_id;
        } else {
          // For custom columns, match by column_id
          return t.column_id === statusOrColumnId;
        }
      })
      .sort((a, b) => a.position - b.position);
  };

  return {
    tasks,
    loading,
    error,
    createTask,
    updateTask,
    deleteTask,
    moveTask,
    getTasksByStatus,
    refetch: fetchTasks,
  };
};
