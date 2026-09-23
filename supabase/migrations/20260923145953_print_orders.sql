-- Physical canvas print orders fulfilled via the Prodigi print-on-demand API.
-- Guest checkout is allowed (user_id nullable) — writes happen only via the
-- service-role key from the Stripe webhook, never client-side.

create table if not exists public.print_orders (
  id bigserial primary key,
  user_id uuid references auth.users(id) on delete set null,
  artwork_id text not null references public.artworks(id),
  stripe_session_id text not null unique,
  sku text not null,
  status text not null default 'pending'
    check (status in ('pending','submitted','failed','shipped','delivered','cancelled')),
  vendor_order_id text,
  tracking_url text,
  amount_total integer,
  currency text,
  recipient_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.print_orders is 'Physical canvas print orders fulfilled via the Prodigi print-on-demand API.';

alter table public.print_orders enable row level security;

create policy "print_orders_select_own"
  on public.print_orders
  for select
  to authenticated
  using (auth.uid() = user_id);
