import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface KanbanColumn {
  id: string;
  project_id: string;
  name: string;
  position: number;
  created_at: string;
}

// Default columns when no custom columns exist
export const DEFAULT_COLUMNS = [
  { id: 'backlog', name: 'Backlog', position: 0 },
  { id: 'todo', name: 'To Do', position: 1 },
  { id: 'in_progress', name: 'In Progress', position: 2 },
  { id: 'done', name: 'Done', position: 3 },
];

export const useKanbanColumns = (projectId: string | null) => {
  const { user } = useAuth();
  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usingDefaults, setUsingDefaults] = useState(true);

  const fetchColumns = useCallback(async () => {
    if (!user || !projectId) {
      setColumns([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('kanban_columns')
        .select('*')
        .eq('project_id', projectId)
        .order('position', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        setColumns(data);
        setUsingDefaults(false);
      } else {
        // Use default columns if none exist
        setColumns([]);
        setUsingDefaults(true);
      }
    } catch (err) {
      console.error('Error fetching columns:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch columns');
    } finally {
      setLoading(false);
    }
  }, [user, projectId]);

  const createColumn = async (name: string) => {
    if (!user || !projectId) throw new Error('Must be logged in with a project selected');

    const maxPosition = columns.length > 0 
      ? Math.max(...columns.map(c => c.position)) + 1 
      : 0;

    const { data, error } = await supabase
      .from('kanban_columns')
      .insert({
        project_id: projectId,
        name,
        position: maxPosition,
      })
      .select()
      .single();

    if (error) throw error;
    setColumns(prev => [...prev, data]);
    setUsingDefaults(false);
    return data;
  };

  const updateColumn = async (id: string, updates: Partial<Pick<KanbanColumn, 'name' | 'position'>>) => {
    if (!user) throw new Error('Must be logged in');

    const { data, error } = await supabase
      .from('kanban_columns')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    setColumns(prev => prev.map(c => c.id === id ? data : c));
    return data;
  };

  const deleteColumn = async (id: string) => {
    if (!user) throw new Error('Must be logged in');

    const { error } = await supabase
      .from('kanban_columns')
      .delete()
      .eq('id', id);

    if (error) throw error;
    setColumns(prev => {
      const filtered = prev.filter(c => c.id !== id);
      if (filtered.length === 0) {
        setUsingDefaults(true);
      }
      return filtered;
    });
  };

  const initializeDefaultColumns = async () => {
    if (!user || !projectId) throw new Error('Must be logged in with a project selected');

    const columnsToInsert = DEFAULT_COLUMNS.map(col => ({
      project_id: projectId,
      name: col.name,
      position: col.position,
    }));

    const { data, error } = await supabase
      .from('kanban_columns')
      .insert(columnsToInsert)
      .select();

    if (error) throw error;
    setColumns(data || []);
    setUsingDefaults(false);
    return data;
  };

  useEffect(() => {
    fetchColumns();
  }, [fetchColumns]);

  return {
    columns,
    loading,
    error,
    usingDefaults,
    createColumn,
    updateColumn,
    deleteColumn,
    initializeDefaultColumns,
    refetch: fetchColumns,
  };
};
