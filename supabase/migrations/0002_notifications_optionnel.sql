-- ============================================================================
-- OPTIONNEL - Notifications automatiques par déclencheur SQL (pg_net)
-- ----------------------------------------------------------------------------
-- Utilise ce fichier UNIQUEMENT si tu ne veux pas passer par
-- « Database Webhooks » du tableau de bord Supabase (recommandé, voir SETUP.md).
--
-- Avant d'exécuter :
--   1. Remplace  <PROJECT_REF>  par la référence de ton projet Supabase
--   2. Remplace  <WEBHOOK_SECRET>  par la même valeur que le secret
--      WEBHOOK_SECRET défini sur tes Edge Functions
-- ============================================================================

create extension if not exists pg_net with schema extensions;

-- Nouvelle annonce publiée -> e-mail + WhatsApp à l'administrateur
create or replace function public.notify_new_phone()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  perform net.http_post(
    url     := 'https://<PROJECT_REF>.supabase.co/functions/v1/notify-admin',
    headers := jsonb_build_object(
                 'Content-Type', 'application/json',
                 'x-webhook-secret', '<WEBHOOK_SECRET>'
               ),
    body    := jsonb_build_object('type', 'INSERT', 'table', 'phones', 'record', to_jsonb(new))
  );
  return new;
end;
$$;

drop trigger if exists on_phone_created_notify on public.phones;
create trigger on_phone_created_notify
  after insert on public.phones
  for each row execute function public.notify_new_phone();

-- Nouvelle demande d'achat -> e-mail + WhatsApp à l'administrateur
create or replace function public.notify_new_purchase_request()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  perform net.http_post(
    url     := 'https://<PROJECT_REF>.supabase.co/functions/v1/notify-admin',
    headers := jsonb_build_object(
                 'Content-Type', 'application/json',
                 'x-webhook-secret', '<WEBHOOK_SECRET>'
               ),
    body    := jsonb_build_object('type', 'INSERT', 'table', 'purchase_requests', 'record', to_jsonb(new))
  );
  return new;
end;
$$;

drop trigger if exists on_purchase_request_created_notify on public.purchase_requests;
create trigger on_purchase_request_created_notify
  after insert on public.purchase_requests
  for each row execute function public.notify_new_purchase_request();

-- Paiement confirmé -> e-mail + WhatsApp à l'administrateur
create or replace function public.notify_payment_confirmed()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if new.payment_status = 'paye' and old.payment_status is distinct from 'paye' then
    perform net.http_post(
      url     := 'https://<PROJECT_REF>.supabase.co/functions/v1/notify-admin',
      headers := jsonb_build_object(
                   'Content-Type', 'application/json',
                   'x-webhook-secret', '<WEBHOOK_SECRET>'
                 ),
      body    := jsonb_build_object('type', 'UPDATE', 'table', 'purchase_requests', 'record', to_jsonb(new))
    );
  end if;
  return new;
end;
$$;

drop trigger if exists on_payment_confirmed_notify on public.purchase_requests;
create trigger on_payment_confirmed_notify
  after update on public.purchase_requests
  for each row execute function public.notify_payment_confirmed();
