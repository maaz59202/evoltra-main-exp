-- Prevent duplicate accounts by enforcing unique emails at the profile layer.
-- NOTE: This will fail if duplicates already exist; clean them before applying.
CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_unique
ON public.profiles (LOWER(email))
WHERE email IS NOT NULL;
