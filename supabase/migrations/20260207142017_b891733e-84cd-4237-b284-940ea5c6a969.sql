-- Drop the existing restrictive INSERT policy
DROP POLICY IF EXISTS "Users can create organizations" ON public.organizations;

-- Create a permissive INSERT policy for authenticated users
CREATE POLICY "Users can create organizations"
ON public.organizations
FOR INSERT
TO authenticated
WITH CHECK (true);
