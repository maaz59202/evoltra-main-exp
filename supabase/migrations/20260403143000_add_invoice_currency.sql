alter table public.invoices
  add column if not exists currency text not null default 'USD';

update public.invoices
set currency = 'USD'
where currency is null or trim(currency) = '';

alter table public.invoices
  drop constraint if exists invoices_currency_check;

alter table public.invoices
  add constraint invoices_currency_check
  check (currency in ('USD', 'PKR', 'EUR', 'GBP', 'AED'));

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
  normalized_currency text := upper(trim(coalesce(p_currency, 'USD')));
begin
  if current_user_id is null then
    raise exception 'Unauthorized' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.organization_members
    where organization_id = p_organization_id
      and user_id = current_user_id
  ) then
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

  if normalized_currency not in ('USD', 'PKR', 'EUR', 'GBP', 'AED') then
    raise exception 'Unsupported invoice currency' using errcode = '23514';
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
    normalized_currency,
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
