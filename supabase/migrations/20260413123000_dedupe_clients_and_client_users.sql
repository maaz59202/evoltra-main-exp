-- Canonicalize duplicate client identity records so project access, messages,
-- and invoice ownership all resolve to one durable row per email.

begin;

-- 1) Merge duplicate client_users by lower(email)
with ranked_client_users as (
  select
    id,
    lower(email) as normalized_email,
    full_name,
    password_hash,
    created_at,
    row_number() over (
      partition by lower(email)
      order by
        case when password_hash is not null then 0 else 1 end,
        created_at asc,
        id asc
    ) as rn
  from public.client_users
),
canonical_client_users as (
  select
    normalized_email,
    id as canonical_id,
    full_name as canonical_full_name,
    password_hash as canonical_password_hash
  from ranked_client_users
  where rn = 1
),
duplicate_client_users as (
  select
    r.id as duplicate_id,
    c.canonical_id,
    r.full_name as duplicate_full_name,
    r.password_hash as duplicate_password_hash
  from ranked_client_users r
  join canonical_client_users c
    on c.normalized_email = r.normalized_email
  where r.rn > 1
)
update public.client_users cu
set
  full_name = coalesce(cu.full_name, d.duplicate_full_name),
  password_hash = coalesce(cu.password_hash, d.duplicate_password_hash),
  updated_at = now()
from duplicate_client_users d
where cu.id = d.canonical_id;

with ranked_client_users as (
  select
    id,
    lower(email) as normalized_email,
    row_number() over (
      partition by lower(email)
      order by
        case when password_hash is not null then 0 else 1 end,
        created_at asc,
        id asc
    ) as rn
  from public.client_users
),
canonical_client_users as (
  select normalized_email, id as canonical_id
  from ranked_client_users
  where rn = 1
),
duplicate_client_users as (
  select r.id as duplicate_id, c.canonical_id
  from ranked_client_users r
  join canonical_client_users c
    on c.normalized_email = r.normalized_email
  where r.rn > 1
)
update public.project_clients pc
set client_user_id = d.canonical_id
from duplicate_client_users d
where pc.client_user_id = d.duplicate_id
  and not exists (
    select 1
    from public.project_clients existing
    where existing.project_id = pc.project_id
      and existing.client_user_id = d.canonical_id
  );

with ranked_client_users as (
  select
    id,
    lower(email) as normalized_email,
    row_number() over (
      partition by lower(email)
      order by
        case when password_hash is not null then 0 else 1 end,
        created_at asc,
        id asc
    ) as rn
  from public.client_users
),
canonical_client_users as (
  select normalized_email, id as canonical_id
  from ranked_client_users
  where rn = 1
),
duplicate_client_users as (
  select r.id as duplicate_id, c.canonical_id
  from ranked_client_users r
  join canonical_client_users c
    on c.normalized_email = r.normalized_email
  where r.rn > 1
)
delete from public.project_clients pc
using duplicate_client_users d
where pc.client_user_id = d.duplicate_id;

with ranked_client_users as (
  select
    id,
    lower(email) as normalized_email,
    row_number() over (
      partition by lower(email)
      order by
        case when password_hash is not null then 0 else 1 end,
        created_at asc,
        id asc
    ) as rn
  from public.client_users
),
canonical_client_users as (
  select normalized_email, id as canonical_id
  from ranked_client_users
  where rn = 1
),
duplicate_client_users as (
  select r.id as duplicate_id, c.canonical_id
  from ranked_client_users r
  join canonical_client_users c
    on c.normalized_email = r.normalized_email
  where r.rn > 1
)
update public.project_messages pm
set client_sender_id = d.canonical_id
from duplicate_client_users d
where pm.client_sender_id = d.duplicate_id;

with ranked_client_users as (
  select
    id,
    lower(email) as normalized_email,
    row_number() over (
      partition by lower(email)
      order by
        case when password_hash is not null then 0 else 1 end,
        created_at asc,
        id asc
    ) as rn
  from public.client_users
),
canonical_client_users as (
  select normalized_email, id as canonical_id
  from ranked_client_users
  where rn = 1
)
delete from public.client_users cu
where exists (
  select 1
  from ranked_client_users r
  join canonical_client_users c
    on c.normalized_email = r.normalized_email
  where r.rn > 1
    and cu.id = r.id
);

create unique index if not exists client_users_email_unique
on public.client_users (lower(email));

-- 2) Merge duplicate billing clients by organization + lower(email)
with ranked_clients as (
  select
    id,
    organization_id,
    lower(email) as normalized_email,
    name,
    created_at,
    row_number() over (
      partition by organization_id, lower(email)
      order by created_at asc, id asc
    ) as rn
  from public.clients
  where email is not null
),
canonical_clients as (
  select
    organization_id,
    normalized_email,
    id as canonical_id,
    name as canonical_name
  from ranked_clients
  where rn = 1
),
duplicate_clients as (
  select
    r.id as duplicate_id,
    c.canonical_id,
    r.name as duplicate_name
  from ranked_clients r
  join canonical_clients c
    on c.organization_id = r.organization_id
   and c.normalized_email = r.normalized_email
  where r.rn > 1
)
update public.clients c
set name = coalesce(nullif(c.name, ''), nullif(d.duplicate_name, ''))
from duplicate_clients d
where c.id = d.canonical_id;

with ranked_clients as (
  select
    id,
    organization_id,
    lower(email) as normalized_email,
    row_number() over (
      partition by organization_id, lower(email)
      order by created_at asc, id asc
    ) as rn
  from public.clients
  where email is not null
),
canonical_clients as (
  select organization_id, normalized_email, id as canonical_id
  from ranked_clients
  where rn = 1
),
duplicate_clients as (
  select r.id as duplicate_id, c.canonical_id
  from ranked_clients r
  join canonical_clients c
    on c.organization_id = r.organization_id
   and c.normalized_email = r.normalized_email
  where r.rn > 1
)
update public.invoices i
set client_id = d.canonical_id
from duplicate_clients d
where i.client_id = d.duplicate_id;

with ranked_clients as (
  select
    id,
    organization_id,
    lower(email) as normalized_email,
    row_number() over (
      partition by organization_id, lower(email)
      order by created_at asc, id asc
    ) as rn
  from public.clients
  where email is not null
)
delete from public.clients c
where exists (
  select 1
  from ranked_clients r
  where r.rn > 1
    and c.id = r.id
);

create unique index if not exists clients_org_email_unique
on public.clients (organization_id, lower(email))
where email is not null;

commit;
