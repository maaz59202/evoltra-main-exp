-- Remove deprecated Puck experimental funnel fields and normalize any stale live URLs.

-- If any experimental Puck funnels were published with /fp/:id URLs, point them back to
-- the legacy public funnel route so existing published funnels don't lead to dead routes.
update public.funnels
set published_url = '/f/' || id::text
where published_url like '/fp/%';

alter table public.funnels
  drop column if exists editor_type,
  drop column if exists puck_data;
