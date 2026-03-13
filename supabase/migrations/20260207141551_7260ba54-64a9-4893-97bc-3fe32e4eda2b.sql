-- Create tasks table for Kanban board
CREATE TABLE public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'backlog' CHECK (status IN ('backlog', 'todo', 'in_progress', 'done')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  assignee_id UUID,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- RLS policies based on project organization membership
CREATE POLICY "Org members can view tasks"
ON public.tasks
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM projects p
    JOIN organization_members om ON om.organization_id = p.organization_id
    WHERE p.id = tasks.project_id AND om.user_id = auth.uid()
  )
);

CREATE POLICY "Org members can insert tasks"
ON public.tasks
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM projects p
    JOIN organization_members om ON om.organization_id = p.organization_id
    WHERE p.id = tasks.project_id AND om.user_id = auth.uid()
  )
);

CREATE POLICY "Org members can update tasks"
ON public.tasks
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM projects p
    JOIN organization_members om ON om.organization_id = p.organization_id
    WHERE p.id = tasks.project_id AND om.user_id = auth.uid()
  )
);

CREATE POLICY "Org members can delete tasks"
ON public.tasks
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM projects p
    JOIN organization_members om ON om.organization_id = p.organization_id
    WHERE p.id = tasks.project_id AND om.user_id = auth.uid()
  )
);

-- Add updated_at trigger
CREATE TRIGGER update_tasks_updated_at
BEFORE UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_tasks_project_status ON public.tasks(project_id, status);
CREATE INDEX idx_tasks_position ON public.tasks(project_id, status, position);