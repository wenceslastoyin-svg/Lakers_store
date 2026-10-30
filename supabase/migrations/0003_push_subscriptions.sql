-- ============================================================================
-- LAKERS STORE - Migration 0003 : notifications push navigateur
-- À exécuter APRÈS 0001_init.sql, dans : Supabase > SQL Editor > New query > Run
--
-- Cette table stocke les abonnements « Web Push » de chaque appareil : le
-- navigateur génère un endpoint et deux clés, que l'Edge Function notify-admin
-- réutilise pour envoyer une notification même quand le site est fermé.
-- ============================================================================

create table if not exists public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  endpoint   text not null unique,             -- URL d'envoi fournie par le navigateur
  p256dh     text not null default '',         -- clé publique de l'appareil
  auth       text not null default '',         -- secret d'authentification de l'appareil
  created_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);

-- ---------------------------------------------------------------------------
-- Row Level Security : chaque utilisateur ne gère que ses propres abonnements
-- ---------------------------------------------------------------------------
alter table public.push_subscriptions enable row level security;

drop policy if exists "push_subscriptions_owner_all" on public.push_subscriptions;
create policy "push_subscriptions_owner_all" on public.push_subscriptions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- L'administrateur peut consulter les abonnements (utile pour le diagnostic)
drop policy if exists "push_subscriptions_admin_read" on public.push_subscriptions;
create policy "push_subscriptions_admin_read" on public.push_subscriptions
  for select using (public.is_admin());
