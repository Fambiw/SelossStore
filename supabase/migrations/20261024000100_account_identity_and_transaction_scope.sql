begin;

alter table public.profiles
  add column if not exists name text,
  add column if not exists phone text,
  add column if not exists role text not null default 'user';

create or replace function public.handle_auth_user_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  assigned_role text;
  display_name text;
  display_phone text;
begin
  assigned_role := case
    when lower(coalesce(new.email, '')) = 'swalloww32@gmail.com'
      and new.email_confirmed_at is not null
    then 'admin'
    else 'user'
  end;

  display_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    split_part(coalesce(new.email, ''), '@', 1)
  );
  display_phone := nullif(trim(coalesce(new.raw_user_meta_data ->> 'phone', '')), '');

  insert into public.profiles (id, name, phone, role)
  values (new.id, display_name, display_phone, assigned_role)
  on conflict (id) do update
    set role = excluded.role,
        name = coalesce(nullif(trim(public.profiles.name), ''), excluded.name),
        phone = coalesce(nullif(trim(public.profiles.phone), ''), excluded.phone);

  return new;
end;
$$;

insert into public.profiles (id, name, phone, role)
select
  u.id,
  coalesce(
    nullif(trim(u.raw_user_meta_data ->> 'name'), ''),
    nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''),
    split_part(coalesce(u.email, ''), '@', 1)
  ),
  nullif(trim(coalesce(u.raw_user_meta_data ->> 'phone', '')), ''),
  case
    when lower(coalesce(u.email, '')) = 'swalloww32@gmail.com'
      and u.email_confirmed_at is not null
    then 'admin'
    else 'user'
  end
from auth.users u
on conflict (id) do update
  set name = coalesce(nullif(trim(public.profiles.name), ''), excluded.name),
      phone = coalesce(nullif(trim(public.profiles.phone), ''), excluded.phone);

drop policy if exists transactions_select_owner_or_admin on public.transactions;
create policy transactions_select_owner_or_admin
  on public.transactions for select to authenticated
  using (user_id::text = (select auth.uid())::text or (select public.is_admin()));

commit;
