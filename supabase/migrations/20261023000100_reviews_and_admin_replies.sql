begin;

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  rating smallint not null check (rating between 1 and 5),
  description text not null
    check (char_length(description) between 1 and 500)
    check (description !~ '^[[:space:]]*$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reviews_one_per_user unique (user_id)
);

create index reviews_created_at_idx on public.reviews (created_at desc);

create table public.review_replies (
  review_id uuid primary key references public.reviews(id) on delete cascade,
  admin_id uuid not null references auth.users(id) on delete restrict,
  updated_by_admin_id uuid references auth.users(id) on delete restrict,
  body text not null
    check (char_length(body) between 1 and 1000)
    check (body !~ '^[[:space:]]*$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.reviews enable row level security;
alter table public.review_replies enable row level security;
revoke all on public.reviews, public.review_replies from public, anon, authenticated;

create or replace function public.get_reviews()
returns table (
  review_id uuid,
  rating smallint,
  description text,
  created_at timestamptz,
  reviewer_name text,
  is_mine boolean,
  reply text,
  reply_admin_name text,
  reply_created_at timestamptz,
  reply_updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  return query
    select r.id,
      r.rating,
      r.description,
      r.created_at,
      case
        when char_length(trim(coalesce(reviewer.name, ''))) > 0
          then left(trim(reviewer.name), 2) || '***'
        else 'Pe***'
      end,
      r.user_id = auth.uid(),
      rr.body,
      case when rr.review_id is not null
        then coalesce(nullif(trim(admin_profile.name), ''), 'Admin Seloss Store')
        else null
      end,
      rr.created_at,
      rr.updated_at
    from public.reviews r
    left join public.profiles reviewer on reviewer.id = r.user_id
    left join public.review_replies rr on rr.review_id = r.id
    left join public.profiles admin_profile on admin_profile.id = rr.admin_id
    order by r.created_at desc, r.id;
end;
$$;

create or replace function public.submit_review(
  p_rating smallint,
  p_description text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid;
  new_review_id uuid;
begin
  current_user_id := auth.uid();
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  if p_rating is null or p_rating < 1 or p_rating > 5 then
    raise exception 'Rating must be between 1 and 5';
  end if;

  if p_description is null
    or char_length(p_description) > 500
    or p_description ~ '^[[:space:]]*$' then
    raise exception 'Review must contain 1 to 500 non-space characters';
  end if;

  insert into public.reviews (user_id, rating, description)
    values (
      current_user_id,
      p_rating,
      regexp_replace(p_description, '^[[:space:]]+|[[:space:]]+$', '', 'g')
    )
    returning id into new_review_id;

  return new_review_id;
end;
$$;

create or replace function public.update_review(
  p_review_id uuid,
  p_rating smallint,
  p_description text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if p_rating is null or p_rating < 1 or p_rating > 5 then
    raise exception 'Rating must be between 1 and 5';
  end if;

  if p_description is null
    or char_length(p_description) > 500
    or p_description ~ '^[[:space:]]*$' then
    raise exception 'Review must contain 1 to 500 non-space characters';
  end if;

  update public.reviews r
    set rating = p_rating,
        description = regexp_replace(p_description, '^[[:space:]]+|[[:space:]]+$', '', 'g'),
        updated_at = now()
    where r.id = p_review_id
      and r.user_id = auth.uid();

  if not found then
    raise exception 'Review not found or permission denied';
  end if;

  return p_review_id;
end;
$$;

create or replace function public.save_review_reply(
  p_review_id uuid,
  p_reply text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_admin_id uuid;
begin
  current_admin_id := auth.uid();
  if current_admin_id is null then
    raise exception 'Authentication required';
  end if;
  if not public.is_admin() then
    raise exception 'Administrator permission required';
  end if;
  if p_reply is null
    or char_length(p_reply) > 1000
    or p_reply ~ '^[[:space:]]*$' then
    raise exception 'Reply must contain 1 to 1000 non-space characters';
  end if;

  insert into public.review_replies (review_id, admin_id, body)
    values (
      p_review_id,
      current_admin_id,
      regexp_replace(p_reply, '^[[:space:]]+|[[:space:]]+$', '', 'g')
    )
    on conflict (review_id) do update
      set body = excluded.body,
          updated_by_admin_id = current_admin_id,
          updated_at = now();

  return p_review_id;
end;
$$;

revoke all on function public.get_reviews() from public, anon;
revoke all on function public.submit_review(smallint, text) from public, anon;
revoke all on function public.update_review(uuid, smallint, text) from public, anon;
revoke all on function public.save_review_reply(uuid, text) from public, anon;
grant execute on function public.get_reviews() to authenticated;
grant execute on function public.submit_review(smallint, text) to authenticated;
grant execute on function public.update_review(uuid, smallint, text) to authenticated;
grant execute on function public.save_review_reply(uuid, text) to authenticated;

commit;
