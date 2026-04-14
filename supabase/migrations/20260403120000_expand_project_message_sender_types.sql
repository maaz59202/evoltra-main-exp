alter table public.project_messages
  drop constraint if exists project_messages_sender_type_check;

update public.project_messages
set sender_type = 'freelancer'
where sender_type = 'user';

alter table public.project_messages
  add constraint project_messages_sender_type_check
  check (sender_type in ('client', 'freelancer', 'user'));
