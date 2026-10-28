begin;

alter table public.transactions
  add column if not exists payment_verified_at timestamptz,
  add column if not exists payment_verified_by uuid references auth.users(id) on delete set null;

create table if not exists public.payment_status_history (
  id uuid primary key default gen_random_uuid(),
  transaction_id text not null references public.transactions(id) on delete cascade,
  payment_status text not null,
  changed_by uuid not null references auth.users(id) on delete restrict,
  changed_at timestamptz not null default now()
);

create index if not exists payment_status_history_transaction_idx
  on public.payment_status_history (transaction_id, changed_at desc);

alter table public.payment_status_history enable row level security;
revoke all on public.payment_status_history from public, anon, authenticated;
grant select on public.payment_status_history to authenticated;

drop policy if exists payment_status_history_select_admin_or_owner on public.payment_status_history;
create policy payment_status_history_select_admin_or_owner
  on public.payment_status_history for select to authenticated
  using (
    changed_by::text = (select auth.uid())::text
    or (select public.is_admin())
    or exists (
      select 1
      from public.transactions t
      where t.id::text = payment_status_history.transaction_id::text
        and t.user_id::text = (select auth.uid())::text
    )
  );

create or replace function public.confirm_payment(p_transaction_id text)
returns public.transactions
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_transaction public.transactions;
  updated_transaction public.transactions;
begin
  if not public.is_admin() then
    raise exception 'Administrator permission required';
  end if;

  select *
    into current_transaction
    from public.transactions
   where id = p_transaction_id
   for update;

  if not found then
    raise exception 'Transaction not found';
  end if;
  if current_transaction.proof_image is null or btrim(current_transaction.proof_image) = '' then
    raise exception 'Payment proof is required before verification';
  end if;
  if current_transaction.payment_status = 'paid' then
    return current_transaction;
  end if;
  if current_transaction.payment_status <> 'pending' then
    raise exception 'Payment status cannot be verified from its current state';
  end if;

  update public.transactions
     set payment_status = 'paid',
         payment_verified_at = now(),
         payment_verified_by = (select auth.uid()),
         updated_at = now()
   where id = p_transaction_id
   returning * into updated_transaction;

  insert into public.payment_status_history (transaction_id, payment_status, changed_by)
  values (p_transaction_id, 'paid', (select auth.uid()));

  return updated_transaction;
end;
$$;

revoke all on function public.confirm_payment(text) from public, anon;
grant execute on function public.confirm_payment(text) to authenticated;

create table if not exists public.testimonials (
  id uuid primary key default gen_random_uuid(),
  image_path text not null unique,
  alt_text text not null default 'Testimoni pembayaran Seloss Store',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists testimonials_created_at_idx
  on public.testimonials (created_at desc);

alter table public.testimonials enable row level security;
revoke all on public.testimonials from public, anon, authenticated;
grant select on public.testimonials to authenticated;
grant insert, update, delete on public.testimonials to authenticated;

drop policy if exists testimonials_select_authenticated on public.testimonials;
create policy testimonials_select_authenticated
  on public.testimonials for select to authenticated
  using (true);

drop policy if exists testimonials_write_admin on public.testimonials;
create policy testimonials_write_admin
  on public.testimonials for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'testimonials',
  'testimonials',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists testimonials_storage_read_authenticated on storage.objects;
create policy testimonials_storage_read_authenticated
  on storage.objects for select to authenticated
  using (bucket_id = 'testimonials');

drop policy if exists testimonials_storage_insert_admin on storage.objects;
create policy testimonials_storage_insert_admin
  on storage.objects for insert to authenticated
  with check (bucket_id = 'testimonials' and (select public.is_admin()));

drop policy if exists testimonials_storage_update_admin on storage.objects;
create policy testimonials_storage_update_admin
  on storage.objects for update to authenticated
  using (bucket_id = 'testimonials' and (select public.is_admin()))
  with check (bucket_id = 'testimonials' and (select public.is_admin()));

drop policy if exists testimonials_storage_delete_admin on storage.objects;
create policy testimonials_storage_delete_admin
  on storage.objects for delete to authenticated
  using (bucket_id = 'testimonials' and (select public.is_admin()));

commit;
