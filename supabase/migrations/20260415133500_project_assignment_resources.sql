alter table public.projects
  add column if not exists assigned_user_id uuid,
  add column if not exists resources jsonb not null default '[]'::jsonb;
