begin;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  phone text,
  role text not null default 'user'
);

alter table public.profiles
  add column if not exists name text,
  add column if not exists phone text,
  add column if not exists role text not null default 'user';

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    join auth.users u on u.id = p.id
    where p.id = (select auth.uid())
      and p.role = 'admin'
      and lower(u.email) = 'swalloww32@gmail.com'
      and u.email_confirmed_at is not null
  );
$$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

do $$
declare
  target_table text;
  policy_row record;
begin
  foreach target_table in array array['products', 'banners'] loop
    if to_regclass(format('public.%I', target_table)) is null then
      raise exception 'Required table public.% is missing', target_table;
    end if;

    for policy_row in
      select policyname
      from pg_policies
      where schemaname = 'public' and tablename = target_table
    loop
      execute format('drop policy %I on public.%I', policy_row.policyname, target_table);
    end loop;
  end loop;
end;
$$;

alter table public.products enable row level security;
revoke all on public.products from public, anon, authenticated;
grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;

create policy products_read_public
  on public.products for select to anon, authenticated
  using (true);

create policy products_write_admin
  on public.products for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

alter table public.banners enable row level security;
revoke all on public.banners from public, anon, authenticated;
grant select on public.banners to anon, authenticated;
grant insert, update, delete on public.banners to authenticated;

create policy banners_read_public
  on public.banners for select to anon, authenticated
  using (true);

create policy banners_write_admin
  on public.banners for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create or replace function public.handle_auth_user_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  assigned_role text;
  display_name text;
begin
  assigned_role := case
    when lower(coalesce(new.email, '')) = 'swalloww32@gmail.com'
      and new.email_confirmed_at is not null
    then 'admin'
    else 'user'
  end;

  display_name := coalesce(
    nullif(new.raw_user_meta_data ->> 'name', ''),
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    split_part(coalesce(new.email, ''), '@', 1)
  );

  insert into public.profiles (id, name, role)
  values (new.id, display_name, assigned_role)
  on conflict (id) do update
    set role = excluded.role,
        name = coalesce(nullif(public.profiles.name, ''), excluded.name);

  return new;
end;
$$;

drop trigger if exists on_auth_user_profile_created on auth.users;
create trigger on_auth_user_profile_created
  after insert or update of email, email_confirmed_at on auth.users
  for each row execute function public.handle_auth_user_profile();

insert into public.profiles (id, name, role)
select
  u.id,
  coalesce(
    nullif(u.raw_user_meta_data ->> 'name', ''),
    nullif(u.raw_user_meta_data ->> 'full_name', ''),
    split_part(coalesce(u.email, ''), '@', 1)
  ),
  case
    when lower(coalesce(u.email, '')) = 'swalloww32@gmail.com'
      and u.email_confirmed_at is not null
    then 'admin'
    else 'user'
  end
from auth.users u
on conflict (id) do update
  set role = excluded.role,
      name = coalesce(nullif(public.profiles.name, ''), excluded.name);

do $$
declare
  policy_row record;
begin
  for policy_row in
    select policyname
    from pg_policies
    where schemaname = 'public' and tablename = 'profiles'
  loop
    execute format('drop policy %I on public.profiles', policy_row.policyname);
  end loop;
end;
$$;

alter table public.profiles enable row level security;
revoke all on public.profiles from public, anon, authenticated;
grant select on public.profiles to authenticated;
grant update (name, phone) on public.profiles to authenticated;

create policy profiles_select_self_or_admin
  on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));

create policy profiles_update_self_or_admin
  on public.profiles for update to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()))
  with check (id = (select auth.uid()) or (select public.is_admin()));

create table if not exists public.transactions (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete restrict,
  user_name text not null,
  user_email text not null,
  user_wa text not null,
  product_id text not null,
  product_name text not null,
  product_icon text not null default '',
  variant_id text not null,
  variant_name text not null,
  amount numeric(12, 2) not null check (amount >= 0),
  payment_method text not null,
  form_data jsonb not null default '{}'::jsonb,
  proof_image text,
  status text not null default 'pending',
  payment_status text not null default 'pending',
  wa_message text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.transactions
  add column if not exists payment_status text not null default 'pending';

alter table public.transactions
  alter column payment_status set default 'pending';

update public.transactions
set payment_status = 'pending'
where payment_status is null;

alter table public.transactions
  alter column payment_status set not null;

create index if not exists transactions_user_created_at_idx
  on public.transactions (user_id, created_at desc);

do $$
declare
  policy_row record;
begin
  for policy_row in
    select policyname
    from pg_policies
    where schemaname = 'public' and tablename = 'transactions'
  loop
    execute format('drop policy %I on public.transactions', policy_row.policyname);
  end loop;
end;
$$;

alter table public.transactions enable row level security;
revoke all on public.transactions from public, anon, authenticated;
grant select on public.transactions to authenticated;
grant update (status, updated_at) on public.transactions to authenticated;

create policy transactions_select_owner_or_admin
  on public.transactions for select to authenticated
  using (user_id = (select auth.uid())::text or (select public.is_admin()));

create policy transactions_update_admin
  on public.transactions for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'order-proofs',
  'order-proofs',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists order_proofs_insert_owner on storage.objects;
create policy order_proofs_insert_owner
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'order-proofs'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists order_proofs_select_owner_or_admin on storage.objects;
create policy order_proofs_select_owner_or_admin
  on storage.objects for select to authenticated
  using (
    bucket_id = 'order-proofs'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or (select public.is_admin())
    )
  );

drop policy if exists order_proofs_delete_orphan_owner on storage.objects;
create policy order_proofs_delete_orphan_owner
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'order-proofs'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and not exists (
      select 1 from public.transactions t where t.proof_image = name
    )
  );

drop policy if exists order_proofs_restrict_scope on storage.objects;
create policy order_proofs_restrict_scope
  on storage.objects as restrictive for all to authenticated
  using (
    bucket_id <> 'order-proofs'
    or (storage.foldername(name))[1] = (select auth.uid())::text
    or (select public.is_admin())
  )
  with check (
    bucket_id <> 'order-proofs'
    or (storage.foldername(name))[1] = (select auth.uid())::text
    or (select public.is_admin())
  );

create or replace function public.create_order(
  p_product_id text,
  p_variant_id text,
  p_user_name text,
  p_user_wa text,
  p_payment_method text,
  p_form_data jsonb default '{}'::jsonb,
  p_proof_image text default null,
  p_wa_message text default ''
)
returns setof public.transactions
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid;
  current_user_email text;
  verified_name text;
  verified_image text;
  verified_variant_name text;
  verified_amount numeric;
  new_order_id text;
begin
  current_user_id := auth.uid();
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  if length(trim(coalesce(p_user_name, ''))) = 0 then
    raise exception 'Customer name is required';
  end if;

  if coalesce(p_user_wa, '') !~ '^(08|628)[0-9]{8,12}$' then
    raise exception 'A valid WhatsApp number is required';
  end if;

  if p_payment_method not in ('qris', 'dana', 'gopay', 'shopeepay') then
    raise exception 'Unsupported payment method';
  end if;

  select u.email
    into current_user_email
    from auth.users u
    where u.id = current_user_id;

  if current_user_email is null then
    raise exception 'Authenticated account email is unavailable';
  end if;

  if p_proof_image is not null and (
    split_part(p_proof_image, '/', 1) <> current_user_id::text
    or not exists (
      select 1
      from storage.objects o
      where o.bucket_id = 'order-proofs'
        and o.name = p_proof_image
    )
  ) then
    raise exception 'Payment proof is missing or does not belong to this account';
  end if;

  select p.name, coalesce(p.image, ''), variant ->> 'n',
         (variant ->> 'p')::numeric
    into verified_name, verified_image, verified_variant_name, verified_amount
    from public.products p
    cross join lateral jsonb_array_elements(coalesce(p.vars, '[]'::jsonb)) variant
    where p.id::text = p_product_id
      and variant ->> 'id' = p_variant_id
    limit 1;

  if verified_name is null or verified_variant_name is null or verified_amount is null then
    raise exception 'Product or variant is unavailable';
  end if;

  new_order_id := 'ORD-' || to_char(clock_timestamp(), 'DDMMYY') || '-'
    || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));

  return query
    insert into public.transactions (
      id, user_id, user_name, user_email, user_wa, product_id, product_name,
      product_icon, variant_id, variant_name, amount, payment_method, form_data,
      proof_image, status, payment_status, wa_message, created_at, updated_at
    ) values (
      new_order_id, current_user_id, trim(p_user_name), current_user_email,
      p_user_wa, p_product_id, verified_name, verified_image, p_variant_id,
      verified_variant_name, verified_amount, p_payment_method,
      coalesce(p_form_data, '{}'::jsonb), p_proof_image, 'pending', 'pending',
      coalesce(p_wa_message, ''), now(), now()
    )
    returning *;
end;
$$;

revoke all on function public.create_order(text, text, text, text, text, jsonb, text, text) from public, anon;
grant execute on function public.create_order(text, text, text, text, text, jsonb, text, text) to authenticated;

commit;
