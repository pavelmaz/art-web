-- Fine Art Pro: one row per auth user; Stripe + subscription fields updated by webhooks (later step).

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  stripe_customer_id text,
  subscription_status text not null default 'none',
  plan_interval text,
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'User profile; subscription_* filled by Stripe webhooks.';

alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
