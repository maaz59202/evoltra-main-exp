-- Add RLS policies for clients table
CREATE POLICY "Org members can view clients"
ON public.clients FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE organization_members.organization_id = clients.organization_id
        AND organization_members.user_id = auth.uid()
    )
);

CREATE POLICY "Org members can insert clients"
ON public.clients FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE organization_members.organization_id = clients.organization_id
        AND organization_members.user_id = auth.uid()
    )
);

CREATE POLICY "Org members can update clients"
ON public.clients FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE organization_members.organization_id = clients.organization_id
        AND organization_members.user_id = auth.uid()
    )
);

CREATE POLICY "Org members can delete clients"
ON public.clients FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE organization_members.organization_id = clients.organization_id
        AND organization_members.user_id = auth.uid()
    )
);

-- Add RLS policies for project_messages table
CREATE POLICY "Users can view project messages"
ON public.project_messages FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.projects p
        JOIN public.organization_members om ON om.organization_id = p.organization_id
        WHERE p.id = project_messages.project_id
        AND om.user_id = auth.uid()
    )
    OR sender_id = auth.uid()
);

CREATE POLICY "Users can insert project messages"
ON public.project_messages FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can delete their own messages"
ON public.project_messages FOR DELETE
TO authenticated
USING (auth.uid() = sender_id);