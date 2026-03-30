-- Allow authenticated org members to view client users linked to their projects
CREATE POLICY "Org members can view client_users for their projects"
ON public.client_users
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.project_clients pc
    JOIN public.projects p ON p.id = pc.project_id
    JOIN public.organization_members om ON om.organization_id = p.organization_id
    WHERE pc.client_user_id = client_users.id
      AND om.user_id = auth.uid()
  )
);
