create or replace function public.set_org_payment_receiving_details(
  p_organization_id uuid,
  p_payment_receiving_details jsonb,
  p_payment_account_name text,
  p_payment_account_number text,
  p_payment_bank_name text,
  p_payment_link text default null
)
returns public.organizations
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  updated_org public.organizations%rowtype;
begin
  if current_user_id is null then
    raise exception 'Unauthorized' using errcode = '42501';
  end if;

  if not public.has_org_role(p_organization_id, array['owner', 'admin'], current_user_id) then
    raise exception 'You are not allowed to update payment receiving details for this organization' using errcode = '42501';
  end if;

  update public.organizations
  set
    payment_receiving_details = p_payment_receiving_details,
    payment_account_name = p_payment_account_name,
    payment_account_number = p_payment_account_number,
    payment_bank_name = p_payment_bank_name,
    payment_link = p_payment_link
  where id = p_organization_id
  returning * into updated_org;

  if updated_org.id is null then
    raise exception 'Organization not found' using errcode = 'P0002';
  end if;

  return updated_org;
end;
$$;

grant execute on function public.set_org_payment_receiving_details(uuid, jsonb, text, text, text, text) to authenticated;
