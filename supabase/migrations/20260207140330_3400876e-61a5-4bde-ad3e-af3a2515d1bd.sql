-- Add INSERT policy for projects
CREATE POLICY "Org members can insert projects"
ON public.projects
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_members.organization_id = projects.organization_id
    AND organization_members.user_id = auth.uid()
  )
);

-- Add UPDATE policy for projects
CREATE POLICY "Org members can update projects"
ON public.projects
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_members.organization_id = projects.organization_id
    AND organization_members.user_id = auth.uid()
  )
);

-- Add DELETE policy for projects
CREATE POLICY "Org members can delete projects"
ON public.projects
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_members.organization_id = projects.organization_id
    AND organization_members.user_id = auth.uid()
  )
);