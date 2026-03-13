-- Create kanban_columns table for custom columns
CREATE TABLE public.kanban_columns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.kanban_columns ENABLE ROW LEVEL SECURITY;

-- Org members can view columns
CREATE POLICY "Org members can view kanban columns"
ON public.kanban_columns
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM projects p
    JOIN organization_members om ON om.organization_id = p.organization_id
    WHERE p.id = kanban_columns.project_id AND om.user_id = auth.uid()
  )
);

-- Org members can insert columns
CREATE POLICY "Org members can insert kanban columns"
ON public.kanban_columns
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM projects p
    JOIN organization_members om ON om.organization_id = p.organization_id
    WHERE p.id = kanban_columns.project_id AND om.user_id = auth.uid()
  )
);

-- Org members can update columns
CREATE POLICY "Org members can update kanban columns"
ON public.kanban_columns
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM projects p
    JOIN organization_members om ON om.organization_id = p.organization_id
    WHERE p.id = kanban_columns.project_id AND om.user_id = auth.uid()
  )
);

-- Org members can delete columns
CREATE POLICY "Org members can delete kanban columns"
ON public.kanban_columns
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM projects p
    JOIN organization_members om ON om.organization_id = p.organization_id
    WHERE p.id = kanban_columns.project_id AND om.user_id = auth.uid()
  )
);

-- Update tasks table to use column_id instead of status enum
ALTER TABLE public.tasks ADD COLUMN column_id uuid REFERENCES public.kanban_columns(id) ON DELETE SET NULL;