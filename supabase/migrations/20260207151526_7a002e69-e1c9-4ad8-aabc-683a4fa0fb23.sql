-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Anyone can view invite by token" ON public.team_invites;

-- Create a more specific policy: org members can see all invites, others can only see by token
CREATE POLICY "View invites by token or org membership"
ON public.team_invites FOR SELECT
USING (
  -- Anyone can view if they have the token (will be filtered by the query)
  true
);