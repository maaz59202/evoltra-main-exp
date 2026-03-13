-- Create team_invites table for pending invitations
CREATE TABLE public.team_invites (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member',
    invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
    accepted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(organization_id, email)
);

-- Enable RLS
ALTER TABLE public.team_invites ENABLE ROW LEVEL SECURITY;

-- Org members can view invites for their organization
CREATE POLICY "Org members can view invites"
ON public.team_invites FOR SELECT
USING (EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.organization_id = team_invites.organization_id
    AND om.user_id = auth.uid()
));

-- Org admins/owners can create invites
CREATE POLICY "Org admins can create invites"
ON public.team_invites FOR INSERT
WITH CHECK (EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.organization_id = team_invites.organization_id
    AND om.user_id = auth.uid()
    AND om.role IN ('owner', 'admin')
));

-- Org admins/owners can delete invites
CREATE POLICY "Org admins can delete invites"
ON public.team_invites FOR DELETE
USING (EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.organization_id = team_invites.organization_id
    AND om.user_id = auth.uid()
    AND om.role IN ('owner', 'admin')
));

-- Add UPDATE policy for organization_members (for role changes)
CREATE POLICY "Org admins can update member roles"
ON public.organization_members FOR UPDATE
USING (EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.organization_id = organization_members.organization_id
    AND om.user_id = auth.uid()
    AND om.role IN ('owner', 'admin')
));

-- Add DELETE policy for organization_members (for removing members)
CREATE POLICY "Org admins can remove members"
ON public.organization_members FOR DELETE
USING (EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.organization_id = organization_members.organization_id
    AND om.user_id = auth.uid()
    AND om.role IN ('owner', 'admin')
) OR user_id = auth.uid());