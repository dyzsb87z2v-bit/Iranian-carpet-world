-- IRAN CARPET WORLD — initial schema
-- Run in Supabase SQL editor or with `supabase db push`.
-- Every table has Row Level Security. Buyers only see published products;
-- sellers only see their own rows; admins see everything. Toman prices live
-- in product_private, which buyers can never read.

create extension if not exists "pgcrypto";

-- ───────────────────────── enums
create type user_role as enum ('buyer', 'seller', 'admin');
create type seller_status as enum ('pending', 'approved', 'rejected', 'suspended');
create type product_status as enum ('draft', 'pending_review', 'published', 'rejected', 'archived');
create type weave_type as enum ('hand_knotted', 'hand_woven_kilim', 'machine_made');
create type product_condition as enum ('new', 'vintage', 'antique', 'used');
create type media_kind as enum ('image', 'video');
create type inquiry_status as enum ('new', 'answered', 'closed');
create type order_status as enum ('draft', 'awaiting_payment', 'paid', 'shipped', 'delivered', 'cancelled', 'refunded', 'disputed');
create type duty_responsibility as enum ('buyer_dap', 'platform_ddp');

-- ───────────────────────── profiles
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null default 'buyer',
  full_name text,
  country_code char(2),
  preferred_locale text not null default 'en' check (preferred_locale in ('en', 'de', 'fa')),
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

-- ───────────────────────── sellers
create table sellers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid unique references profiles(id) on delete set null,
  slug text unique not null,
  shop_name text not null,
  shop_name_fa text,
  city text not null,
  province text,
  phone text,
  bio_en text,
  bio_de text,
  bio_fa text,
  telegram_chat_id bigint unique,
  telegram_username text,
  status seller_status not null default 'pending',
  is_verified boolean not null default false,
  commission_rate numeric(5,4),          -- null = platform default from settings
  identity_notes text,                   -- admin-only KYB notes (DSA trader info)
  created_at timestamptz not null default now(),
  approved_at timestamptz
);

create or replace function public.my_seller_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from sellers where owner_id = auth.uid();
$$;

-- ───────────────────────── categories
create table categories (
  id serial primary key,
  slug text unique not null,
  name_en text not null,
  name_de text not null,
  name_fa text not null,
  sort_order int not null default 0
);

insert into categories (slug, name_en, name_de, name_fa, sort_order) values
  ('city', 'City rugs', 'Stadtteppiche', 'فرش شهری', 1),
  ('tribal', 'Tribal & nomadic', 'Nomaden- und Stammesteppiche', 'فرش عشایری', 2),
  ('kilim', 'Kilims & gabbeh', 'Kelims und Gabbehs', 'گلیم و گبه', 3),
  ('runner', 'Runners', 'Läufer', 'کناره', 4),
  ('silk', 'Silk rugs', 'Seidenteppiche', 'فرش ابریشمی', 5),
  ('antique', 'Antique & vintage', 'Antik und Vintage', 'فرش قدیمی و عتیقه', 6);

-- ───────────────────────── products
create table products (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references sellers(id) on delete cascade,
  category_id int references categories(id),
  slug text unique not null,
  status product_status not null default 'draft',

  title_en text, title_de text, title_fa text,
  description_en text, description_de text, description_fa text,

  length_cm int check (length_cm > 0),
  width_cm int check (width_cm > 0),
  weave weave_type,
  pile_material text,          -- e.g. wool, silk, wool_silk
  foundation_material text,    -- warp & weft, e.g. cotton, wool, silk
  origin_city text,            -- e.g. Tabriz, Kashan, Isfahan
  origin_region text,
  design text,                 -- e.g. medallion, herati, garden
  colors text[] not null default '{}',
  knot_density_per_dm2 int,    -- only when it can be evidenced
  approx_age_years int,
  condition product_condition,
  condition_notes text,
  authenticity_notes text,
  has_certificate boolean not null default false,

  quantity int not null default 1 check (quantity >= 0),
  price_eur numeric(10,2) check (price_eur >= 0),  -- set/confirmed by admin
  ships_from_country char(2) not null default 'IR',
  weight_kg numeric(6,2),
  duty_responsibility duty_responsibility not null default 'buyer_dap',

  is_featured boolean not null default false,
  source text not null default 'web' check (source in ('web', 'telegram', 'admin')),
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);

create index products_status_idx on products (status, published_at desc);
create index products_seller_idx on products (seller_id);
create index products_filter_idx on products (weave, origin_city, price_eur);

-- Seller-only data. Toman price must never reach buyers.
create table product_private (
  product_id uuid primary key references products(id) on delete cascade,
  price_toman bigint check (price_toman >= 0),
  internal_notes text
);

create table product_media (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  kind media_kind not null default 'image',
  storage_path text,           -- path in the "product-media" bucket
  telegram_file_id text,       -- original file id when uploaded via bot
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table product_reviews_log (
  id bigserial primary key,
  product_id uuid not null references products(id) on delete cascade,
  admin_id uuid references profiles(id),
  from_status product_status,
  to_status product_status not null,
  reason text,
  created_at timestamptz not null default now()
);

create table ai_suggestions (
  id bigserial primary key,
  product_id uuid references products(id) on delete cascade,
  model text not null,
  input jsonb not null,
  output jsonb not null,
  created_at timestamptz not null default now()
);

-- ───────────────────────── buyers
create table favorites (
  user_id uuid not null references profiles(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

-- Purchase interest instead of orders until the legal path is confirmed.
create table inquiries (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  buyer_id uuid references profiles(id) on delete set null,
  name text not null,
  email text not null,
  country_code char(2) not null,
  message text,
  status inquiry_status not null default 'new',
  created_at timestamptz not null default now()
);

-- Ready for later. Inserts are blocked by RLS (no insert policy) until enabled.
create table orders (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid references profiles(id),
  status order_status not null default 'draft',
  ship_to_country char(2) not null,
  subtotal_eur numeric(10,2) not null,
  shipping_eur numeric(10,2) not null default 0,
  insurance_eur numeric(10,2) not null default 0,
  duty_eur numeric(10,2) not null default 0,
  import_vat_eur numeric(10,2) not null default 0,
  clearance_eur numeric(10,2) not null default 0,
  commission_eur numeric(10,2) not null default 0,
  duty_responsibility duty_responsibility not null default 'buyer_dap',
  tracking_number text,
  created_at timestamptz not null default now()
);

create table order_items (
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid not null references products(id),
  seller_id uuid not null references sellers(id),
  price_eur numeric(10,2) not null,
  primary key (order_id, product_id)
);

-- ───────────────────────── settings & bot
create table settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

insert into settings (key, value) values
  ('commission_rate', '0.12'),
  ('toman_per_eur', '600000'),
  ('insurance_rate', '0.015'),
  ('duty_rate_hand_knotted', '0.03'),
  ('duty_rate_machine_made', '0.08'),
  ('clearance_fee_eur', '45'),
  ('checkout_enabled', 'false');

create table telegram_sessions (
  chat_id bigint primary key,
  state text not null default 'idle',
  data jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

-- ───────────────────────── updated_at trigger
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
create trigger products_touch before update on products
  for each row execute function public.touch_updated_at();

-- Sellers may not publish, set the EUR price or feature their own products.
create or replace function public.guard_product_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin() or auth.uid() is null then
    return new;  -- admins and service role (bot) pass
  end if;
  if new.status not in ('draft', 'pending_review', 'archived') then
    raise exception 'Only an admin can publish or reject a product';
  end if;
  if new.price_eur is distinct from old.price_eur or new.is_featured is distinct from old.is_featured then
    raise exception 'Only an admin can change price_eur or featured flag';
  end if;
  return new;
end $$;
create trigger products_guard before update on products
  for each row execute function public.guard_product_update();

-- Users cannot promote themselves; sellers cannot approve or verify themselves.
create or replace function public.guard_privileged_columns() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin() or auth.uid() is null
     or current_setting('app.trusted_update', true) = 'on' then return new; end if;
  if tg_table_name = 'profiles' and new.role is distinct from old.role then
    raise exception 'Only an admin can change roles';
  end if;
  if tg_table_name = 'sellers' and (new.status is distinct from old.status
      or new.is_verified is distinct from old.is_verified
      or new.commission_rate is distinct from old.commission_rate
      or new.identity_notes is distinct from old.identity_notes) then
    raise exception 'Only an admin can change seller status, verification or commission';
  end if;
  return new;
end $$;
create trigger profiles_guard before update on profiles
  for each row execute function public.guard_privileged_columns();
create trigger sellers_guard before update on sellers
  for each row execute function public.guard_privileged_columns();

-- When a seller registers on the web, mark their profile as seller.
create or replace function public.promote_seller_owner() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.owner_id is not null then
    perform set_config('app.trusted_update', 'on', true);
    update profiles set role = 'seller' where id = new.owner_id and role = 'buyer';
    perform set_config('app.trusted_update', 'off', true);
  end if;
  return new;
end $$;
create trigger sellers_promote_owner after insert on sellers
  for each row execute function public.promote_seller_owner();

-- ───────────────────────── RLS
alter table profiles enable row level security;
alter table sellers enable row level security;
alter table categories enable row level security;
alter table products enable row level security;
alter table product_private enable row level security;
alter table product_media enable row level security;
alter table product_reviews_log enable row level security;
alter table ai_suggestions enable row level security;
alter table favorites enable row level security;
alter table inquiries enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table settings enable row level security;
alter table telegram_sessions enable row level security;  -- service role only

create policy "own profile" on profiles for select using (id = auth.uid() or public.is_admin());
create policy "update own profile" on profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy "admin manages profiles" on profiles for all using (public.is_admin());

create policy "public approved sellers" on sellers for select
  using (status = 'approved' or owner_id = auth.uid() or public.is_admin());
create policy "register as seller" on sellers for insert
  with check (owner_id = auth.uid() and status = 'pending' and is_verified = false);
create policy "seller edits own shop" on sellers for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "admin manages sellers" on sellers for all using (public.is_admin());

create policy "categories readable" on categories for select using (true);
create policy "admin manages categories" on categories for all using (public.is_admin());

create policy "published products readable" on products for select
  using (status = 'published' or seller_id = public.my_seller_id() or public.is_admin());
create policy "seller creates products" on products for insert
  with check (seller_id = public.my_seller_id() and status in ('draft', 'pending_review')
              and price_eur is null and is_featured = false
              and exists (select 1 from sellers where id = seller_id and status = 'approved'));
create policy "seller updates own products" on products for update
  using (seller_id = public.my_seller_id()) with check (seller_id = public.my_seller_id());
create policy "admin manages products" on products for all using (public.is_admin());

create policy "seller/admin private data" on product_private for all
  using (public.is_admin() or exists (select 1 from products p where p.id = product_id and p.seller_id = public.my_seller_id()))
  with check (public.is_admin() or exists (select 1 from products p where p.id = product_id and p.seller_id = public.my_seller_id()));

create policy "media of visible products" on product_media for select
  using (exists (select 1 from products p where p.id = product_id
         and (p.status = 'published' or p.seller_id = public.my_seller_id() or public.is_admin())));
create policy "seller manages own media" on product_media for all
  using (exists (select 1 from products p where p.id = product_id and p.seller_id = public.my_seller_id()))
  with check (exists (select 1 from products p where p.id = product_id and p.seller_id = public.my_seller_id()));
create policy "admin manages media" on product_media for all using (public.is_admin());

create policy "review log visible to owner/admin" on product_reviews_log for select
  using (public.is_admin() or exists (select 1 from products p where p.id = product_id and p.seller_id = public.my_seller_id()));
create policy "admin writes review log" on product_reviews_log for insert with check (public.is_admin());

create policy "admin reads ai" on ai_suggestions for select using (public.is_admin());

create policy "own favorites" on favorites for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "anyone can inquire" on inquiries for insert
  with check (status = 'new' and (buyer_id is null or buyer_id = auth.uid())
              and exists (select 1 from products p where p.id = product_id and p.status = 'published'));
create policy "inquiry visible to buyer/seller/admin" on inquiries for select
  using (buyer_id = auth.uid() or public.is_admin()
         or exists (select 1 from products p where p.id = product_id and p.seller_id = public.my_seller_id()));
create policy "admin manages inquiries" on inquiries for update using (public.is_admin());

create policy "own orders" on orders for select using (buyer_id = auth.uid() or public.is_admin());
create policy "own order items" on order_items for select
  using (public.is_admin() or seller_id = public.my_seller_id()
         or exists (select 1 from orders o where o.id = order_id and o.buyer_id = auth.uid()));

create policy "public settings readable" on settings for select
  using (key in ('toman_per_eur', 'insurance_rate', 'duty_rate_hand_knotted', 'duty_rate_machine_made', 'clearance_fee_eur', 'checkout_enabled') or public.is_admin());
create policy "admin manages settings" on settings for all using (public.is_admin());

-- ───────────────────────── storage
insert into storage.buckets (id, name, public) values ('product-media', 'product-media', true)
  on conflict (id) do nothing;
create policy "sellers upload to own folder" on storage.objects for insert
  with check (bucket_id = 'product-media' and (storage.foldername(name))[1] = public.my_seller_id()::text);
create policy "admin manages media files" on storage.objects for all
  using (bucket_id = 'product-media' and public.is_admin());
