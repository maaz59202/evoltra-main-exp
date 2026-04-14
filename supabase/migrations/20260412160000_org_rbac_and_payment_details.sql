create or replace function public.org_role(
  _organization_id uuid,
  _user_id uuid default auth.uid()
)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select om.role
  from public.organization_members om
  where om.organization_id = _organization_id
    and om.user_id = _user_id
  limit 1
$$;

create or replace function public.is_org_member(
  _organization_id uuid,
  _user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members om
    where om.organization_id = _organization_id
      and om.user_id = _user_id
  )
$$;

create or replace function public.has_org_role(
  _organization_id uuid,
  _roles text[],
  _user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members om
    where om.organization_id = _organization_id
      and om.user_id = _user_id
      and om.role = any(_roles)
  )
$$;

grant execute on function public.org_role(uuid, uuid) to authenticated, anon;
grant execute on function public.is_org_member(uuid, uuid) to authenticated, anon;
grant execute on function public.has_org_role(uuid, text[], uuid) to authenticated, anon;

alter table public.organizations
  add column if not exists payment_account_name text,
  add column if not exists payment_account_number text,
  add column if not exists payment_bank_name text,
  add column if not exists payment_link text;

drop policy if exists "Users can create organizations" on public.organizations;
create policy "Authenticated users can create organizations"
on public.organizations
for insert
to authenticated
with check (auth.uid() is not null);

do $$
declare
  policy_name text;
begin
  for policy_name in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'organization_members'
  loop
    execute format('drop policy if exists %I on public.organization_members', policy_name);
  end loop;
end $$;

create policy "Org members can view organization members"
on public.organization_members
for select
to authenticated
using (public.is_org_member(organization_id));

create policy "Owners and admins can add members"
on public.organization_members
for insert
to authenticated
with check (
  public.has_org_role(organization_id, array['owner', 'admin'])
  or auth.uid() = user_id
);

create policy "Owners and admins can update members"
on public.organization_members
for update
to authenticated
using (public.has_org_role(organization_id, array['owner', 'admin']))
with check (public.has_org_role(organization_id, array['owner', 'admin']));

create policy "Owners admins or self can delete memberships"
on public.organization_members
for delete
to authenticated
using (
  public.has_org_role(organization_id, array['owner', 'admin'])
  or user_id = auth.uid()
);

do $$
declare
  policy_name text;
begin
  for policy_name in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'team_invites'
  loop
    execute format('drop policy if exists %I on public.team_invites', policy_name);
  end loop;
end $$;

create policy "Invite lookup by token is public"
on public.team_invites
for select
using (true);

create policy "Owners and admins can create invites"
on public.team_invites
for insert
to authenticated
with check (public.has_org_role(organization_id, array['owner', 'admin']));

create policy "Owners admins and invitees can update invites"
on public.team_invites
for update
to authenticated
using (
  public.has_org_role(organization_id, array['owner', 'admin'])
  or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
)
with check (
  public.has_org_role(organization_id, array['owner', 'admin'])
  or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
);

create policy "Owners and admins can delete invites"
on public.team_invites
for delete
to authenticated
using (public.has_org_role(organization_id, array['owner', 'admin']));

do $$
declare
  policy_name text;
begin
  for policy_name in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'projects'
  loop
    execute format('drop policy if exists %I on public.projects', policy_name);
  end loop;
end $$;

create policy "Org members can view projects"
on public.projects
for select
to authenticated
using (public.is_org_member(organization_id));

create policy "Owners and admins can insert projects"
on public.projects
for insert
to authenticated
with check (public.has_org_role(organization_id, array['owner', 'admin']));

create policy "Owners and admins can update projects"
on public.projects
for update
to authenticated
using (public.has_org_role(organization_id, array['owner', 'admin']))
with check (public.has_org_role(organization_id, array['owner', 'admin']));

create policy "Owners and admins can delete projects"
on public.projects
for delete
to authenticated
using (public.has_org_role(organization_id, array['owner', 'admin']));

do $$
declare
  policy_name text;
begin
  for policy_name in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'clients'
  loop
    execute format('drop policy if exists %I on public.clients', policy_name);
  end loop;
end $$;

create policy "Org members can view clients"
on public.clients
for select
to authenticated
using (public.is_org_member(organization_id));

create policy "Owners and admins can insert clients"
on public.clients
for insert
to authenticated
with check (public.has_org_role(organization_id, array['owner', 'admin']));

create policy "Owners and admins can update clients"
on public.clients
for update
to authenticated
using (public.has_org_role(organization_id, array['owner', 'admin']))
with check (public.has_org_role(organization_id, array['owner', 'admin']));

create policy "Owners and admins can delete clients"
on public.clients
for delete
to authenticated
using (public.has_org_role(organization_id, array['owner', 'admin']));

do $$
declare
  policy_name text;
begin
  for policy_name in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'project_clients'
  loop
    execute format('drop policy if exists %I on public.project_clients', policy_name);
  end loop;
end $$;

create policy "Org members can view project clients"
on public.project_clients
for select
to authenticated
using (
  exists (
    select 1
    from public.projects p
    where p.id = project_clients.project_id
      and public.is_org_member(p.organization_id)
  )
);

create policy "Owners and admins can invite project clients"
on public.project_clients
for insert
to authenticated
with check (
  exists (
    select 1
    from public.projects p
    where p.id = project_clients.project_id
      and public.has_org_role(p.organization_id, array['owner', 'admin'])
  )
);

create policy "Owners and admins can revoke project clients"
on public.project_clients
for delete
to authenticated
using (
  exists (
    select 1
    from public.projects p
    where p.id = project_clients.project_id
      and public.has_org_role(p.organization_id, array['owner', 'admin'])
  )
);

do $$
declare
  policy_name text;
begin
  for policy_name in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'invoices'
  loop
    execute format('drop policy if exists %I on public.invoices', policy_name);
  end loop;
end $$;

create policy "Owners and admins can view invoices"
on public.invoices
for select
to authenticated
using (public.has_org_role(organization_id, array['owner', 'admin']));

create policy "Owners and admins can update invoices"
on public.invoices
for update
to authenticated
using (public.has_org_role(organization_id, array['owner', 'admin']))
with check (public.has_org_role(organization_id, array['owner', 'admin']));

create policy "Owners and admins can delete invoices"
on public.invoices
for delete
to authenticated
using (public.has_org_role(organization_id, array['owner', 'admin']));

do $$
declare
  policy_name text;
begin
  for policy_name in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'invoice_items'
  loop
    execute format('drop policy if exists %I on public.invoice_items', policy_name);
  end loop;
end $$;

create policy "Owners and admins can view invoice items"
on public.invoice_items
for select
to authenticated
using (
  exists (
    select 1
    from public.invoices i
    where i.id = invoice_items.invoice_id
      and public.has_org_role(i.organization_id, array['owner', 'admin'])
  )
);

create policy "Owners and admins can manage invoice items"
on public.invoice_items
for all
to authenticated
using (
  exists (
    select 1
    from public.invoices i
    where i.id = invoice_items.invoice_id
      and public.has_org_role(i.organization_id, array['owner', 'admin'])
  )
)
with check (
  exists (
    select 1
    from public.invoices i
    where i.id = invoice_items.invoice_id
      and public.has_org_role(i.organization_id, array['owner', 'admin'])
  )
);

do $$
declare
  policy_name text;
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'funnels'
  ) then
    execute 'alter table public.funnels enable row level security';

    for policy_name in
      select policyname from pg_policies
      where schemaname = 'public' and tablename = 'funnels'
    loop
      execute format('drop policy if exists %I on public.funnels', policy_name);
    end loop;

    execute $policy$
      create policy "Org members can view funnels"
      on public.funnels
      for select
      to authenticated
      using (public.is_org_member(organization_id))
    $policy$;

    execute $policy$
      create policy "Owners and admins can manage funnels"
      on public.funnels
      for all
      to authenticated
      using (public.has_org_role(organization_id, array['owner', 'admin']))
      with check (public.has_org_role(organization_id, array['owner', 'admin']))
    $policy$;
  end if;
end $$;

do $$
declare
  policy_name text;
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'leads'
  ) then
    execute 'alter table public.leads enable row level security';

    for policy_name in
      select policyname from pg_policies
      where schemaname = 'public' and tablename = 'leads'
    loop
      execute format('drop policy if exists %I on public.leads', policy_name);
    end loop;

    execute $policy$
      create policy "Org members can view leads"
      on public.leads
      for select
      to authenticated
      using (public.is_org_member(organization_id))
    $policy$;
  end if;
end $$;

create or replace function public.create_invoice_with_items(
  p_organization_id uuid,
  p_client_id uuid default null,
  p_project_id uuid default null,
  p_currency text default 'USD',
  p_due_date date default null,
  p_notes text default null,
  p_tax_rate numeric default 0,
  p_status text default 'draft',
  p_items jsonb default '[]'::jsonb
)
returns public.invoices
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  invoice_row public.invoices%rowtype;
  item jsonb;
  item_description text;
  item_quantity numeric;
  item_unit_price numeric;
  item_amount numeric;
  computed_subtotal numeric := 0;
  computed_total numeric := 0;
begin
  if current_user_id is null then
    raise exception 'Unauthorized' using errcode = '42501';
  end if;

  if not public.has_org_role(p_organization_id, array['owner', 'admin'], current_user_id) then
    raise exception 'You are not allowed to create invoices for this organization' using errcode = '42501';
  end if;

  if p_client_id is not null and not exists (
    select 1
    from public.clients
    where id = p_client_id
      and organization_id = p_organization_id
  ) then
    raise exception 'Selected client does not belong to this organization' using errcode = '23514';
  end if;

  if p_project_id is not null and not exists (
    select 1
    from public.projects
    where id = p_project_id
      and organization_id = p_organization_id
  ) then
    raise exception 'Selected project does not belong to this organization' using errcode = '23514';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'At least one invoice item is required' using errcode = '23514';
  end if;

  if p_tax_rate < 0 then
    raise exception 'Tax rate cannot be negative' using errcode = '23514';
  end if;

  for item in
    select value
    from jsonb_array_elements(p_items)
  loop
    item_description := trim(coalesce(item->>'description', ''));
    item_quantity := coalesce((item->>'quantity')::numeric, 0);
    item_unit_price := coalesce((item->>'unit_price')::numeric, 0);

    if item_description = '' then
      raise exception 'Invoice items must include a description' using errcode = '23514';
    end if;

    if item_quantity <= 0 then
      raise exception 'Invoice item quantity must be greater than zero' using errcode = '23514';
    end if;

    if item_unit_price < 0 then
      raise exception 'Invoice item unit price cannot be negative' using errcode = '23514';
    end if;

    item_amount := round((item_quantity * item_unit_price)::numeric, 2);
    computed_subtotal := computed_subtotal + item_amount;
  end loop;

  computed_subtotal := round(computed_subtotal, 2);
  computed_total := round(computed_subtotal + (computed_subtotal * (p_tax_rate / 100)), 2);

  insert into public.invoices (
    invoice_number,
    organization_id,
    client_id,
    project_id,
    currency,
    status,
    subtotal,
    tax_rate,
    total,
    due_date,
    notes
  )
  values (
    public.generate_unique_invoice_number(),
    p_organization_id,
    p_client_id,
    p_project_id,
    coalesce(p_currency, 'USD'),
    p_status,
    computed_subtotal,
    p_tax_rate,
    computed_total,
    p_due_date,
    p_notes
  )
  returning * into invoice_row;

  for item in
    select value
    from jsonb_array_elements(p_items)
  loop
    item_description := trim(coalesce(item->>'description', ''));
    item_quantity := (item->>'quantity')::numeric;
    item_unit_price := (item->>'unit_price')::numeric;
    item_amount := round((item_quantity * item_unit_price)::numeric, 2);

    insert into public.invoice_items (
      invoice_id,
      description,
      quantity,
      unit_price,
      amount
    )
    values (
      invoice_row.id,
      item_description,
      item_quantity,
      item_unit_price,
      item_amount
    );
  end loop;

  return invoice_row;
end;
$$;

grant execute on function public.create_invoice_with_items(uuid, uuid, uuid, text, date, text, numeric, text, jsonb) to authenticated;
