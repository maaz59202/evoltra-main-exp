-- Historical migration restored to keep local migration history aligned with remote.
-- This migration introduced the experimental Puck funnel fields, which are now
-- removed by a later migration.

alter table public.funnels
  add column if not exists editor_type text default 'legacy',
  add column if not exists puck_data jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'funnels_editor_type_check'
  ) then
    alter table public.funnels
      add constraint funnels_editor_type_check
      check (editor_type in ('legacy', 'puck'));
  end if;
end $$;
