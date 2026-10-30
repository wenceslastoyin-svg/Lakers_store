-- ============================================================================
-- LAKERS STORE - Schéma complet de la base de données (Supabase / PostgreSQL)
-- À exécuter dans : Supabase > SQL Editor > New query > Run
-- ============================================================================

-- Extension pour les UUID
create extension if not exists "pgcrypto";

-- ============================================================================
-- 1. TABLES
-- ============================================================================

-- ---------------------------------------------------------------------------
-- profiles : informations publiques de chaque utilisateur (1 ligne par compte)
-- La ligne est créée automatiquement à l'inscription (voir trigger plus bas).
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  full_name    text not null default '',
  email        text not null default '',
  phone        text not null default '',       -- numéro de téléphone
  whatsapp     text not null default '',       -- numéro WhatsApp
  is_admin     boolean not null default false, -- true uniquement pour l'administrateur
  is_blocked   boolean not null default false, -- compte bloqué par l'admin
  is_verified  boolean not null default false, -- badge « Vendeur vérifié »
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- phones : annonces de vente de téléphones
-- ---------------------------------------------------------------------------
create table if not exists public.phones (
  id           uuid primary key default gen_random_uuid(),
  seller_id    uuid not null references public.profiles (id) on delete cascade,
  brand        text not null,
  model        text not null,
  condition    text not null check (condition in ('neuf', 'comme_neuf', 'bon_etat', 'a_reparer')),
  storage      text not null default '',
  ram          text not null default '',
  color        text not null default '',
  accessories  text not null default '',
  issues       text not null default '',
  city         text not null,
  description  text not null default '',
  price        integer not null check (price > 0),          -- prix en FCFA
  status       text not null default 'en_attente'
               check (status in ('en_attente', 'validee', 'refusee', 'vendue')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists phones_status_idx  on public.phones (status);
create index if not exists phones_seller_idx  on public.phones (seller_id);
create index if not exists phones_brand_idx   on public.phones (brand);
create index if not exists phones_price_idx   on public.phones (price);

-- ---------------------------------------------------------------------------
-- phone_images : photos d'une annonce (3 à 6 photos)
-- ---------------------------------------------------------------------------
create table if not exists public.phone_images (
  id         uuid primary key default gen_random_uuid(),
  phone_id   uuid not null references public.phones (id) on delete cascade,
  url        text not null,
  position   integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists phone_images_phone_idx on public.phone_images (phone_id);

-- ---------------------------------------------------------------------------
-- purchase_requests : demandes d'achat + suivi du paiement mobile money
-- ---------------------------------------------------------------------------
create table if not exists public.purchase_requests (
  id                uuid primary key default gen_random_uuid(),
  phone_id          uuid not null references public.phones (id) on delete cascade,
  buyer_id          uuid references public.profiles (id) on delete set null,
  buyer_name        text not null,
  buyer_whatsapp    text not null,
  message           text not null default '',
  intent            text not null check (intent in ('payer_maintenant', 'discuter')),
  status            text not null default 'nouvelle'
                    check (status in ('nouvelle', 'en_cours', 'conclue', 'annulee')),
  -- Suivi du paiement mobile money (FedaPay)
  payment_status    text not null default 'en_attente'
                    check (payment_status in ('en_attente', 'paye', 'echoue')),
  payment_provider  text not null default 'fedapay',
  payment_reference text,                      -- référence de la transaction FedaPay
  payment_amount    integer,                   -- montant payé en FCFA
  created_at        timestamptz not null default now()
);

create index if not exists purchase_requests_phone_idx  on public.purchase_requests (phone_id);
create index if not exists purchase_requests_buyer_idx  on public.purchase_requests (buyer_id);
create index if not exists purchase_requests_status_idx on public.purchase_requests (status);

-- ---------------------------------------------------------------------------
-- favorites : téléphones mis en favori par un acheteur
-- ---------------------------------------------------------------------------
create table if not exists public.favorites (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  phone_id   uuid not null references public.phones (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, phone_id)
);

create index if not exists favorites_user_idx on public.favorites (user_id);

-- ---------------------------------------------------------------------------
-- notifications_log : trace des e-mails / messages WhatsApp envoyés à l'admin
-- ---------------------------------------------------------------------------
create table if not exists public.notifications_log (
  id         uuid primary key default gen_random_uuid(),
  type       text not null,                   -- nouvelle_annonce | nouvelle_demande | paiement_confirme
  channel    text not null,                   -- email | whatsapp
  payload    jsonb not null default '{}'::jsonb,
  status     text not null default 'envoye',  -- envoye | erreur
  created_at timestamptz not null default now()
);

-- ============================================================================
-- 2. FONCTIONS UTILITAIRES
-- ============================================================================

-- Indique si l'utilisateur connecté est l'administrateur.
-- SECURITY DEFINER évite la récursion infinie dans les policies RLS.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select coalesce(
    (select p.is_admin from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

-- Indique si le compte connecté est bloqué.
create or replace function public.is_blocked()
returns boolean
language sql
security definer
set search_path = public
as $$
  select coalesce(
    (select p.is_blocked from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

-- Indique si le compte connecté est un « Vendeur vérifié ».
create or replace function public.is_verified()
returns boolean
language sql
security definer
set search_path = public
as $$
  select coalesce(
    (select p.is_verified from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

-- Met à jour automatiquement updated_at sur les annonces.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Crée la ligne « profiles » quand un utilisateur s'inscrit.
-- Les métadonnées (nom, téléphone, WhatsApp) viennent de supabase.auth.signUp options.data
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, phone, whatsapp, is_admin)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'phone', ''),
    coalesce(new.raw_user_meta_data ->> 'whatsapp', ''),
    -- L'administrateur est identifié par son e-mail
    lower(coalesce(new.email, '')) = 'wenceslastoyin@gmail.com'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Protège le statut des annonces :
--  * seul l'admin peut passer une annonce à « validee »
--  * si un vendeur modifie une annonce déjà validée/refusée, elle repasse en attente
create or replace function public.guard_phone_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  if new.status = 'validee' and old.status <> 'validee' then
    raise exception 'Seul l''administrateur peut valider une annonce.';
  end if;

  if new.status = old.status
     and old.status in ('validee', 'refusee')
     and (new.brand, new.model, new.price, new.description, new.storage, new.ram,
          new.color, new.condition, new.city) is distinct from
         (old.brand, old.model, old.price, old.description, old.storage, old.ram,
          old.color, old.condition, old.city) then
    new.status = 'en_attente';
  end if;

  return new;
end;
$$;

drop trigger if exists phones_touch_updated_at on public.phones;
create trigger phones_touch_updated_at
  before update on public.phones
  for each row execute function public.touch_updated_at();

drop trigger if exists phones_guard_status on public.phones;
create trigger phones_guard_status
  before update on public.phones
  for each row execute function public.guard_phone_status();

-- ============================================================================
-- 3. VUE PUBLIQUE DES PROFILS (pour afficher « Vendeur vérifié » sans exposer
--    les numéros de téléphone / WhatsApp / e-mail)
--    La vue n'expose QUE des colonnes non sensibles : elle peut donc être
--    lue librement, même par un visiteur non connecté.
-- ============================================================================
drop view if exists public.public_profiles;
create view public.public_profiles as
select id, full_name, is_verified, created_at
from public.profiles;

-- ============================================================================
-- 4. ROW LEVEL SECURITY (RLS)
-- ============================================================================

alter table public.profiles           enable row level security;
alter table public.phones             enable row level security;
alter table public.phone_images       enable row level security;
alter table public.purchase_requests  enable row level security;
alter table public.favorites          enable row level security;
alter table public.notifications_log  enable row level security;

-- ------------------------------- profiles ---------------------------------
drop policy if exists "profiles_select_self_or_admin" on public.profiles;
create policy "profiles_select_self_or_admin" on public.profiles
  for select using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self" on public.profiles
  for update using (id = auth.uid())
  with check (
    id = auth.uid()
    -- un utilisateur ne peut ni s'auto-promouvoir admin, ni se débloquer,
    -- ni s'attribuer lui-même le badge « Vendeur vérifié »
    and is_admin = public.is_admin()
    and is_blocked = public.is_blocked()
    and is_verified = public.is_verified()
  );

drop policy if exists "profiles_admin_all" on public.profiles;
create policy "profiles_admin_all" on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());

-- Vue publique : tout le monde peut lire les profils publics (nom + badge)
grant select on public.public_profiles to anon, authenticated;

-- -------------------------------- phones ----------------------------------
-- Le catalogue public ne montre que les annonces validées ou vendues.
drop policy if exists "phones_select_public" on public.phones;
create policy "phones_select_public" on public.phones
  for select using (
    status in ('validee', 'vendue')
    or seller_id = auth.uid()
    or public.is_admin()
  );

-- Un utilisateur connecté et non bloqué peut publier une annonce (en attente).
drop policy if exists "phones_insert_owner" on public.phones;
create policy "phones_insert_owner" on public.phones
  for insert with check (
    seller_id = auth.uid()
    and status = 'en_attente'
    and not public.is_blocked()
  );

drop policy if exists "phones_update_owner" on public.phones;
create policy "phones_update_owner" on public.phones
  for update using (seller_id = auth.uid())
  with check (seller_id = auth.uid());

drop policy if exists "phones_delete_owner" on public.phones;
create policy "phones_delete_owner" on public.phones
  for delete using (seller_id = auth.uid());

drop policy if exists "phones_admin_all" on public.phones;
create policy "phones_admin_all" on public.phones
  for all using (public.is_admin()) with check (public.is_admin());

-- ----------------------------- phone_images --------------------------------
drop policy if exists "phone_images_select" on public.phone_images;
create policy "phone_images_select" on public.phone_images
  for select using (
    exists (
      select 1 from public.phones p
      where p.id = phone_images.phone_id
        and (p.status in ('validee', 'vendue') or p.seller_id = auth.uid() or public.is_admin())
    )
  );

drop policy if exists "phone_images_write_owner" on public.phone_images;
create policy "phone_images_write_owner" on public.phone_images
  for all using (
    exists (
      select 1 from public.phones p
      where p.id = phone_images.phone_id and p.seller_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.phones p
      where p.id = phone_images.phone_id and p.seller_id = auth.uid()
    )
  );

-- --------------------------- purchase_requests -----------------------------
drop policy if exists "purchase_requests_insert_buyer" on public.purchase_requests;
create policy "purchase_requests_insert_buyer" on public.purchase_requests
  for insert with check (
    buyer_id = auth.uid()
    and not public.is_blocked()
    and exists (
      select 1 from public.phones p
      where p.id = purchase_requests.phone_id and p.status = 'validee'
    )
  );

-- L'acheteur voit ses demandes, le vendeur voit les demandes sur ses annonces, l'admin voit tout.
drop policy if exists "purchase_requests_select" on public.purchase_requests;
create policy "purchase_requests_select" on public.purchase_requests
  for select using (
    buyer_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.phones p
      where p.id = purchase_requests.phone_id and p.seller_id = auth.uid()
    )
  );

-- Seul l'admin peut changer le statut d'une demande / d'un paiement.
drop policy if exists "purchase_requests_admin_update" on public.purchase_requests;
create policy "purchase_requests_admin_update" on public.purchase_requests
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "purchase_requests_admin_delete" on public.purchase_requests;
create policy "purchase_requests_admin_delete" on public.purchase_requests
  for delete using (public.is_admin());

-- ------------------------------ favorites ----------------------------------
drop policy if exists "favorites_owner_all" on public.favorites;
create policy "favorites_owner_all" on public.favorites
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- -------------------------- notifications_log ------------------------------
drop policy if exists "notifications_admin_read" on public.notifications_log;
create policy "notifications_admin_read" on public.notifications_log
  for select using (public.is_admin());

-- ============================================================================
-- 5. STOCKAGE DES PHOTOS (bucket public « phones »)
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('phones', 'phones', true)
on conflict (id) do nothing;

-- Lecture publique des photos
drop policy if exists "storage_phones_read" on storage.objects;
create policy "storage_phones_read" on storage.objects
  for select using (bucket_id = 'phones');

-- Chaque utilisateur connecté écrit uniquement dans son dossier « {user_id}/... »
drop policy if exists "storage_phones_insert" on storage.objects;
create policy "storage_phones_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'phones' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "storage_phones_update" on storage.objects;
create policy "storage_phones_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'phones' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "storage_phones_delete" on storage.objects;
create policy "storage_phones_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'phones' and (storage.foldername(name))[1] = auth.uid()::text);
