alter table public.project_messages
  add column if not exists client_sender_id uuid references public.client_users(id) on delete set null,
  add column if not exists sender_name text;

create index if not exists project_messages_client_sender_id_idx
  on public.project_messages (client_sender_id);

update public.project_messages pm
set sender_name = coalesce(p.full_name, p.email, 'Team Member')
from public.profiles p
where pm.sender_type <> 'client'
  and pm.sender_id = p.user_id
  and pm.sender_name is null;

with single_client_projects as (
  select
    pc.project_id,
    (array_agg(pc.client_user_id order by pc.client_user_id))[1] as client_user_id
  from public.project_clients pc
  group by pc.project_id
  having count(distinct pc.client_user_id) = 1
)
update public.project_messages pm
set
  client_sender_id = scp.client_user_id,
  sender_name = coalesce(cu.full_name, cu.email, 'Client')
from single_client_projects scp
join public.client_users cu on cu.id = scp.client_user_id
where pm.sender_type = 'client'
  and pm.project_id = scp.project_id
  and pm.client_sender_id is null
  and pm.sender_name is null;
