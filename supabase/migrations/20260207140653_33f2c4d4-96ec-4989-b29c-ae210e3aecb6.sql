-- Add policy for users to create organizations
CREATE POLICY "Users can create organizations"
ON public.organizations
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Add policy for org members to insert new members (for org admins/owners)
CREATE POLICY "Org members can add members"
ON public.organization_members
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.organization_id = organization_members.organization_id
    AND om.user_id = auth.uid()
    AND om.role IN ('owner', 'admin')
  )
  OR auth.uid() = user_id  -- Allow users to add themselves when creating an org
);