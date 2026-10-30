# LAKERS STORE — Guide d'installation et de configuration

Site d'achat et de vente de téléphones mobiles au Bénin (React + Tailwind + Supabase,
paiement mobile money FedaPay, notifications e-mail, WhatsApp et notifications push
navigateur).

---

## 1. Prérequis

| Outil | Version conseillée |
|---|---|
| Node.js | 18 ou plus |
| npm | 9 ou plus |
| Compte Supabase | gratuit |
| Compte Resend | gratuit (100 e-mails/jour) |
| Compte FedaPay | gratuit, mode test immédiat |
| WhatsApp (ton téléphone) | pour CallMeBot |

---

## 2. Installation locale

```bash
cd lakers-store
npm install
cp .env.example .env      # puis remplis le fichier .env
npm run dev               # http://localhost:5173
```

> Sur Windows PowerShell : `Copy-Item .env.example .env`

---

## 3. Supabase

### 3.1 Créer le projet
1. Va sur <https://supabase.com> → **New project** (choisis la région la plus proche, ex. `eu-west-3`).
2. Note le mot de passe de la base.
3. Dans **Project Settings → API**, récupère :
   - `Project URL` → `VITE_SUPABASE_URL` et secret `SUPABASE_URL`
   - `anon public` → `VITE_SUPABASE_ANON_KEY`
   - `service_role` → secret `SUPABASE_SERVICE_ROLE_KEY` (**jamais** dans le frontend)

### 3.2 Créer les tables
1. Ouvre **SQL Editor → New query**.
2. Colle **tout** le contenu de `supabase/migrations/0001_init.sql` puis clique **Run**.
3. Exécute aussi `supabase/migrations/0003_push_subscriptions.sql`
   (table des abonnements aux notifications push navigateur — voir §6).
4. (Optionnel, pour les notifications sans passer par les webhooks du dashboard)
   exécute `supabase/migrations/0002_notifications_optionnel.sql` après avoir remplacé
   `<PROJECT_REF>` et `<WEBHOOK_SECRET>`.

Cela crée les tables `profiles`, `phones`, `phone_images`, `purchase_requests`,
`favorites`, `notifications_log`, `push_subscriptions`, les politiques RLS et le
bucket de photos `phones`.

### 3.3 Authentification
- **Authentication → Providers → Email** : active l'inscription par e-mail.
- **Authentication → Sign In / Providers → Email → Confirm email** :
  désactive-le pendant tes tests (sinon chaque nouvel inscrit doit confirmer son e-mail).
- Pour la production : **Authentication → Emails → SMTP Settings**, renseigne l'hôte SMTP
  de Resend (`smtp.resend.com`, port 465, utilisateur `resend`, mot de passe = ta clé API Resend)
  afin que les e-mails de confirmation partent réellement.

### 3.4 Administrateur
Le trigger SQL marque automatiquement comme administrateur le compte dont l'e-mail est
`wenceslastoyin@gmail.com`. Pour changer d'e-mail administrateur :

```sql
update public.profiles set is_admin = true where email = 'TON-EMAIL@exemple.com';
```

---

## 4. Notifications WhatsApp de l'administrateur (CallMeBot)

CallMeBot est la solution **la plus simple et la moins chère** : gratuite, sans serveur,
et envoie le message sur *ton* numéro WhatsApp.

1. Enregistre dans tes contacts le numéro **+34 644 51 95 23** sous le nom `CallMeBot`.
2. Envoie-lui sur WhatsApp le message exact :
   `I allow callmebot to send me messages`
3. Il te répond avec une **clé API** (un nombre).
4. Utilise-la comme secret `CALLMEBOT_API_KEY` (voir §8), et mets ton numéro dans
   `CALLMEBOT_PHONE` (ex. `+22950813586`).

> Limites du plan gratuit : quelques messages par minute, suffisant pour un site de
> petites annonces. Si tu as besoin de plus, remplace CallMeBot par l'API WhatsApp
> Business Cloud de Meta dans `supabase/functions/_shared/notify.ts`.

---

## 5. E-mails (Resend)

1. Crée un compte sur <https://resend.com>.
2. **API Keys → Create API Key** → copie la clé (`re_...`).
3. En test, tu peux envoyer depuis `onboarding@resend.dev` vers **ta propre adresse**
   (l'adresse du compte Resend). Pour envoyer vers d'autres adresses, ajoute et vérifie
   ton domaine dans **Domains**, puis utilise par exemple
   `LAKERS STORE <notifications@tondomaine.com>`.

Secrets à définir : `RESEND_API_KEY`, `FROM_EMAIL`, `ADMIN_EMAIL`.

---

## 6. Notifications push navigateur (Web Push)

Prévient automatiquement l'utilisateur concerné (vendeur ou acheteur), même quand le site
est fermé : annonce validée ou refusée, paiement confirmé ou échoué.

### 6.1 Créer les clés VAPID
Les clés VAPID identifient ton serveur auprès des services de push des navigateurs.

```bash
npx web-push generate-vapid-keys
```

Tu obtiens deux clés :
- la **clé publique** → `VITE_VAPID_PUBLIC_KEY` dans `.env` **et** secret `VAPID_PUBLIC_KEY`
- la **clé privée** → secret `VAPID_PRIVATE_KEY` (**jamais** dans le code du site)

> Sans installer npm : tu peux les générer sur <https://vapidkeys.com>.

### 6.2 Créer la table
Exécute `supabase/migrations/0003_push_subscriptions.sql` dans **SQL Editor**
(étape §3.2). Elle stocke un abonnement par appareil (endpoint + 2 clés).

### 6.3 Activer dans le site
Ajoute la clé publique dans `.env` :

```
VITE_VAPID_PUBLIC_KEY=BIxxxxxxxxxxxxxxxxxxxxxxxx
```

Le service worker `public/sw.js` est servi automatiquement à l'adresse `/sw.js` (Vite le
recopie dans `dist/` lors du build). Une fois connecté, chaque utilisateur active les
notifications avec le **bouton cloche** de l'en-tête (ou du menu mobile).

### 6.4 Côté serveur
Ajoute `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` et (optionnel) `VAPID_SUBJECT`
à la commande `supabase secrets set` de la section §8. L'Edge Function `notify-admin`
envoie les notifications avec la librairie `web-push`.

---

## 7. FedaPay — compte marchand et clés API (mode test)

FedaPay gère MTN MoMo, Moov Money et Celtiis Cash au Bénin.

### 7.1 Créer le compte marchand
1. Va sur <https://fedapay.com> → **Créer un compte** (gratuit).
2. Valide ton adresse e-mail, puis renseigne ton pays (**Bénin**) et le type de compte
   (particulier ou entreprise).
3. **Le mode test est disponible immédiatement**, avant même la validation du dossier.
4. Pour encaisser réellement, complète ensuite le dossier KYC dans
   **Paramètres → Vérification du compte** (pièce d'identité, et pour une entreprise le
   RCCM / IFU, un compte bancaire ou mobile money de reversement). La validation prend
   quelques jours ouvrés.

### 7.2 Récupérer les clés (test puis production)
1. Va sur le tableau de bord :
   - **Test** : <https://sandbox.fedapay.com>
   - **Production** : <https://live.fedapay.com>
2. **Développeurs → Clés API** (ou *Intégration*), puis copie :
   - Clé **publique** (commence par `pk_`) → `VITE_FEDAPAY_PUBLIC_KEY` (mode test : `pk_sandbox_...`)
   - Clé **secrète** (commence par `sk_`) → secret serveur `FEDAPAY_SECRET_KEY`
     (**ne la mets jamais dans le code du site**)

### 7.3 Mode test d'abord
Dans `.env` :

```
VITE_FEDAPAY_PUBLIC_KEY=pk_sandbox_xxxxxxxx
VITE_FEDAPAY_ENV=sandbox
```

Et côté secrets serveur : `FEDAPAY_ENV=sandbox` avec la clé `sk_sandbox_...`.
En mode sandbox :
- les paiements ne coûtent rien et n'impactent personne ;
- tu peux ouvrir la page de paiement et **approuver manuellement la transaction**
  depuis **sandbox.fedapay.com → Transactions** pour vérifier que ton webhook met bien
  le statut à « payé » et que tu reçois l'e-mail / le WhatsApp.

Quand tout fonctionne, passe à `live` : nouvelles clés `pk_live_...` / `sk_live_...`
et `FEDAPAY_ENV=live`.

### 7.4 Configurer le webhook FedaPay
1. Dans le tableau de bord FedaPay : **Développeurs → Webhooks → Ajouter**.
2. URL : `https://<PROJECT_REF>.supabase.co/functions/v1/fedapay-webhook`
3. Évènements : `transaction.approved`, `transaction.declined`, `transaction.canceled`
   (au minimum).
4. Copie la **clé secrète du webhook** → secret `FEDAPAY_WEBHOOK_SECRET`.

---

## 8. Déployer les Edge Functions

### 8.1 Installer et se connecter
```bash
npm install -g supabase
supabase login
supabase link --project-ref <PROJECT_REF>
```
(`PROJECT_REF` se trouve dans l'URL de ton projet Supabase.)

### 8.2 Définir les secrets
```bash
supabase secrets set \
  ADMIN_EMAIL=wenceslastoyin@gmail.com \
  ADMIN_WHATSAPP=+22950813586 \
  APP_URL=https://ton-site.com \
  RESEND_API_KEY=re_xxxxxxxx \
  FROM_EMAIL="LAKERS STORE <notifications@tondomaine.com>" \
  CALLMEBOT_API_KEY=123456 \
  CALLMEBOT_PHONE=+22950813586 \
  FEDAPAY_SECRET_KEY=sk_sandbox_xxxxxxxx \
  FEDAPAY_ENV=sandbox \
  FEDAPAY_WEBHOOK_SECRET=whsec_xxxxxxxx \
  VAPID_PUBLIC_KEY=BIxxxxxxxxxxxxxxxxxxxxxxxx \
  VAPID_PRIVATE_KEY=yxxxxxxxxxxxxxxxxxxxxxxxx \
  VAPID_SUBJECT=mailto:wenceslastoyin@gmail.com \
  WEBHOOK_SECRET=une-longue-chaine-secrete
```
> `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` sont fournis automatiquement par Supabase.
> Les clés `VAPID_*` servent aux notifications push (voir §6).

### 8.3 Déployer
```bash
supabase functions deploy notify-admin --no-verify-jwt
supabase functions deploy fedapay-create
supabase functions deploy fedapay-webhook --no-verify-jwt
supabase functions deploy fedapay-verify
```
`notify-admin` et `fedapay-webhook` sont appelées par des services externes (webhook de base
de données, FedaPay) qui ne peuvent pas présenter de jeton Supabase : on désactive donc la
vérification JWT et c'est le secret partagé (`WEBHOOK_SECRET`) / la signature HMAC qui
assure la sécurité. Les deux autres fonctions restent protégées par le JWT de l'utilisateur.

### 8.4 Brancher les notifications automatiques
**Méthode recommandée (sans code) — Database Webhooks :**
1. Supabase → **Database → Webhooks → Create a new hook**.
2. **Webhook 1** — annonces :
   - Table `phones`, Évènements : `Insert` **et** `Update`
   - Type : *Supabase Edge Function* → `notify-admin`
   - HTTP Header : `x-webhook-secret` = la valeur de `WEBHOOK_SECRET`
3. **Webhook 2** — demandes d'achat et paiements :
   - Table `purchase_requests`, Évènements : `Insert` **et** `Update`
   - Type : *Supabase Edge Function* → `notify-admin`
   - HTTP Header : `x-webhook-secret` = la valeur de `WEBHOOK_SECRET`

La fonction distingue elle-même les cas : nouvelle annonce, nouvelle demande d'achat,
annonce validée ou refusée (notification push au vendeur), et passage du paiement à
« payé » ou « échoué » (notification push à l'acheteur).

> Alternative équivalente sans dashboard : `0002_notifications_optionnel.sql` (pg_net).

---

## 9. Vérifier que tout fonctionne

| Test | Résultat attendu |
|---|---|
| Publier une annonce | Statut « en attente », e-mail + WhatsApp reçus par l'admin |
| Valider l'annonce dans `/admin` | Visible dans le catalogue public |
| « Je veux l'acheter » → « discuter » | E-mail + WhatsApp à l'admin, page de confirmation |
| « Je veux l'acheter » → « payer maintenant » | Redirection FedaPay, puis statut mis à jour et admin notifié |
| Ajouter un favori / partager sur WhatsApp | Fonctionne, badge « Vendeur vérifié » visible si activé |
| Activer les notifications (cloche) puis valider une annonce | Notification navigateur « Annonce validée » reçue par le vendeur |
| Suivre ses achats dans `/mes-demandes` | Statut, référence FedaPay et bouton « Reprendre le paiement » si échec |
| Onglet Statistiques de `/admin` | Compteurs, paiements du mois et derniers inscrits affichés |

---

## 10. Déploiement du site

```bash
npm run build      # génère le dossier dist/
```
Héberge `dist/` sur Vercel, Netlify ou Cloudflare Pages (gratuit), puis renseigne les
variables `VITE_*` dans les réglages de l'hébergeur et mets à jour `APP_URL` côté secrets
Supabase pour que les liens des e-mails pointent vers le bon domaine.

---

## 11. Rappels de sécurité

- La clé `service_role` ne doit **jamais** apparaître dans le frontend.
- L'accès administrateur est doublement protégé : `is_admin` en base **et** route protégée.
- Les politiques RLS empêchent un vendeur de valider lui-même son annonce
  (trigger `guard_phone_status`).
- Message rappelé sur toutes les annonces : **« Ne payez jamais avant d'avoir vu le téléphone. »**
