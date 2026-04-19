alter table public.projects
  add column if not exists description text,
  add column if not exists due_date date,
  add column if not exists priority text,
  add column if not exists milestones jsonb not null default '[]'::jsonb;

alter table public.projects
  drop constraint if exists projects_priority_check;

alter table public.projects
  add constraint projects_priority_check
  check (priority is null or priority in ('low', 'medium', 'high'));
