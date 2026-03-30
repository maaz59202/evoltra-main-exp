-- Prevent duplicate client accounts by enforcing unique emails
-- NOTE: This will fail if duplicates already exist; clean them before applying.
CREATE UNIQUE INDEX IF NOT EXISTS client_users_email_unique
ON public.client_users (LOWER(email));
