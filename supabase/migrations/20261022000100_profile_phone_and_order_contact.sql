begin;

alter table public.profiles
  add column if not exists phone text;

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
    nullif(new.raw_user_meta_data ->> 'name', ''),
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    split_part(coalesce(new.email, ''), '@', 1)
  );
  display_phone := nullif(trim(coalesce(new.raw_user_meta_data ->> 'phone', '')), '');

  insert into public.profiles (id, name, phone, role)
  values (new.id, display_name, display_phone, assigned_role)
  on conflict (id) do update
    set role = excluded.role,
        name = coalesce(nullif(public.profiles.name, ''), excluded.name),
        phone = coalesce(nullif(public.profiles.phone, ''), excluded.phone);

  return new;
end;
$$;

update public.profiles p
set phone = nullif(trim(coalesce(u.raw_user_meta_data ->> 'phone', '')), '')
from auth.users u
where u.id = p.id
  and (p.phone is null or trim(p.phone) = '')
  and nullif(trim(coalesce(u.raw_user_meta_data ->> 'phone', '')), '') is not null;

drop function if exists public.create_order(text, text, text, text, text, jsonb, text, text);
drop function if exists public.create_order(text, text, text, text, text, text, jsonb, text, text);

create function public.create_order(
  p_product_id text,
  p_variant_id text,
  p_user_name text,
  p_user_wa text,
  p_user_email text,
  p_payment_method text,
  p_form_data jsonb,
  p_proof_image text,
  p_wa_message text
)
returns setof public.transactions
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid;
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

  if trim(coalesce(p_user_email, '')) !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'A valid customer email is required';
  end if;

  if p_payment_method not in ('qris', 'dana', 'gopay', 'shopeepay') then
    raise exception 'Unsupported payment method';
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
      new_order_id, current_user_id, trim(p_user_name), trim(p_user_email),
      p_user_wa, p_product_id, verified_name, verified_image, p_variant_id,
      verified_variant_name, verified_amount, p_payment_method,
      coalesce(p_form_data, '{}'::jsonb), p_proof_image, 'pending', 'pending',
      coalesce(p_wa_message, ''), now(), now()
    )
    returning *;
end;
$$;

revoke all on function public.create_order(text, text, text, text, text, text, jsonb, text, text) from public, anon;
grant execute on function public.create_order(text, text, text, text, text, text, jsonb, text, text) to authenticated;

commit;
