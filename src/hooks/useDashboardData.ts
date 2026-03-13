import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface DashboardStats {
  activeProjects: number;
  completedTasks: number;
  publishedFunnels: number;
  totalTasks: number;
}

export interface ActivityItem {
  id: string;
  type: 'project' | 'task' | 'funnel';
  action: string;
  subject: string;
  time: string;
}

export const useDashboardData = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    activeProjects: 0,
    completedTasks: 0,
    publishedFunnels: 0,
    totalTasks: 0,
  });
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Fetch all in parallel
      const [projectsRes, tasksRes, funnelsRes] = await Promise.all([
        supabase
          .from('projects')
          .select('id, name, status, created_at')
          .order('created_at', { ascending: false }),
        supabase
          .from('tasks')
          .select('id, title, status, created_at, updated_at')
          .order('updated_at', { ascending: false }),
        supabase
          .from('funnels' as any)
          .select('id, name, status, created_at, updated_at')
          .order('updated_at', { ascending: false }),
      ]);

      const projects = projectsRes.data || [];
      const tasks = tasksRes.data || [];
      const funnels = (funnelsRes.data as any[]) || [];

      // Compute stats
      setStats({
        activeProjects: projects.filter((p: any) => p.status === 'active').length,
        completedTasks: tasks.filter((t: any) => t.status === 'done').length,
        publishedFunnels: funnels.filter((f: any) => f.status === 'published').length,
        totalTasks: tasks.length,
      });

      // Build activity feed from real data (most recent 10 items)
      const items: ActivityItem[] = [];

      projects.slice(0, 5).forEach((p: any) => {
        items.push({
          id: `project-${p.id}`,
          type: 'project',
          action: p.status === 'active' ? 'Created project' : `Project ${p.status}`,
          subject: p.name,
          time: p.created_at,
        });
      });

      tasks.slice(0, 5).forEach((t: any) => {
        const action = t.status === 'done' ? 'Completed task' : t.status === 'in_progress' ? 'Started task' : 'Created task';
        items.push({
          id: `task-${t.id}`,
          type: 'task',
          action,
          subject: t.title,
          time: t.updated_at || t.created_at,
        });
      });

      funnels.slice(0, 5).forEach((f: any) => {
        items.push({
          id: `funnel-${f.id}`,
          type: 'funnel',
          action: f.status === 'published' ? 'Published funnel' : 'Updated funnel',
          subject: f.name,
          time: f.updated_at || f.created_at,
        });
      });

      // Sort by time descending and take top 8
      items.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
      setActivity(items.slice(0, 8));
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { stats, activity, loading, refetch: fetchData };
};
