alter table public.organizations
  add column if not exists payment_receiving_details jsonb;
