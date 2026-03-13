-- Fix security warnings: Remove overly permissive policies and add proper restrictions

-- Drop the overly permissive client_users policy
DROP POLICY IF EXISTS "Service role can manage client_users" ON public.client_users;

-- Client users table should only be accessible via edge functions with service role
-- No direct client access - they authenticate through edge functions
CREATE POLICY "No direct access to client_users"
ON public.client_users FOR SELECT
USING (false);

-- Fix notifications insert policy - only allow system/authenticated users to create for valid users
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
CREATE POLICY "Authenticated users can create notifications for org members"
ON public.notifications FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.user_id = notifications.user_id
  )
);