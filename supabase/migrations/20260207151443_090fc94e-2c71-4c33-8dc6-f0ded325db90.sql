-- Allow anyone to read an invite by token (for accepting invites)
CREATE POLICY "Anyone can view invite by token"
ON public.team_invites FOR SELECT
USING (true);

-- Drop the previous policy that required org membership to view
DROP POLICY IF EXISTS "Org members can view invites" ON public.team_invites;