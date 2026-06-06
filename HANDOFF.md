# Handoff — Chantier Insight

> Document de reprise pour continuer le projet sur une autre machine, ou pour
> qu'un autre développeur / agent IA s'y mette. **Dernière mise à jour : 2026-06-06.**

---

## TL;DR

- **MVP complet, poussé sur GitHub et déployé** (Vercel, région Frankfurt).
- **IA de vision = Google Gemini 2.5 Flash** (~10× moins cher que Claude). Claude
  reste dispo en backup dans `src/lib/ai/claude.ts`.
- **Tout est sur `main`** (plus de "code local non poussé"). Dernier tag visé : **`v0.3.0`** (fin du MVP).
- Le MVP couvre : scan→IA→fiche, **collaboration par agence** (1 fiche/panneau/agence),
  **déduplication des panneaux** (permis « PC N° » normalisé ou repli adresse+titre,
  détection dès la fin de l'analyse), **import inter-agence** (compare-image + reprise
  des données vérifiées, lien `panneaux`), registre Entreprises dédupliqué, cycle
  commercial (premier contact + relances), admin (CRUD users/agences/templates,
  supervision, hiérarchie), inscription publique désactivée, menu mobile.

### ⚠️ État au 2026-06-06 : tout est livré

| Bloc | Code | Poussé | SQL appliqué |
|---|---|---|---|
| Scan → IA → fiche (Gemini) | ✅ | ✅ | ✅ |
| Collaboration agence + dédup + import inter-agence | ✅ | ✅ | migrations `…008/009/010` |
| Entreprises (registre dédupliqué) | ✅ | ✅ | ✅ |
| Cycle commercial (contact/relances/templates) | ✅ | ✅ | `…000001(+fix)` |
| Admin (users/agences/templates/supervision) | ✅ | ✅ | `…002/003/004/005/006` |
| Hiérarchie + rôle directeur_commercial | ✅ | ✅ | `…003/004` |
| Menu mobile + signup désactivé | ✅ | ✅ | n/a |

> ⚠️ Quand tu pars d'une **base Supabase vierge**, applique **toutes** les migrations
> de `supabase/migrations/` dans l'ordre via le SQL Editor (le CLI est buggé en local,
> cf § 5.2), puis passe ton compte admin :
> `UPDATE public.profiles SET role='admin' WHERE email='<ton-email>';`

### 🕓 Reste à faire (parqué après le MVP — "cas spécifiques plus tard")

1. **Modèle Contacts** multi-personnes par entreprise (#39) + **visibilité agence** (#40) + **traçabilité/audit** (#41) — calqué sur la base SALTI (un client = N contacts).
2. **Outil admin de fusion** des doublons existants (#36).
3. **Connecteur BDD SALTI** : match raison sociale → SIRET / code client (#37).
4. **Dédup robuste** : matcher permis OU adresse simultanément (variance OCR des chiffres) (#45).
5. **Refonte fiche panneau** (navigation rapide contacts SALTI / inconnus) (#43) + **fiche intervenant enrichie** "où j'en suis" + traçabilité (#44).
6. **Email matinal des relances** (cron Gmail/Workspace ou Resend) — non commencé.
7. (Optionnel) flag "vérifié par humain" sur intervenants (#38).

---

## 1. Reprendre le projet sur le PC fixe (5 minutes)

### 1.1 Cloner & installer

```bash
git clone https://github.com/Dylan-mandiau/chantier.git chantier-insight
cd chantier-insight
```

### 1.2 ⚠️ Node 22 LTS obligatoire

**Next.js 16 + Node 25 → la compilation se bloque indéfiniment**. C'est confirmé, c'est le
gros piège du projet. Sur la machine actuelle on a installé `node@22` via Homebrew.

Sur le PC fixe :

```bash
# Option A — si tu as nvm/fnm :
nvm install 22 && nvm use   # lit le .nvmrc

# Option B — Homebrew macOS sans gestionnaire :
brew install node@22
brew unlink node 2>/dev/null
brew link --overwrite node@22
node --version   # doit afficher v22.x

# Option C — Windows : installer le MSI Node 22 LTS depuis nodejs.org
```

### 1.3 Variables d'environnement

`.env.local` **n'est pas dans le repo** (gitignoré). Tu dois le recréer :

```bash
cp .env.example .env.local
```

Puis remplir avec les vraies valeurs. Les clés actuellement en service (à **rotater avant prod**) :

| Variable | Valeur |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://axpeuldwrheivcmkrxgw.supabase.co` |
| `SUPABASE_PROJECT_ID` | `axpeuldwrheivcmkrxgw` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | clé JWT `anon` (voir Supabase Studio → Settings → API) |
| `SUPABASE_SERVICE_ROLE_KEY` | clé JWT `service_role` (idem, **secret**) — utilisée par `createAdminClient()` pour `/admin/*` et la dédup entreprises |
| `GOOGLE_API_KEY` | `AIza...` (https://aistudio.google.com/apikey) — **IA de vision active (Gemini 2.5 Flash)** |
| `ANTHROPIC_API_KEY` | `sk-ant-...` (console.anthropic.com) — backup, plus utilisé par défaut |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` en dev |

> 🔒 **Rotation obligatoire avant prod** : les clés actuelles ont transité par une conversation
> IA. Régénérer toutes celles marquées "secret" via Supabase Studio (Reset) + Anthropic
> Console (Revoke + Create new).

### 1.4 Install + démarrage

```bash
npm install
npm run dev
```

Ouvrir http://localhost:3000 → doit rediriger vers `/login`.

---

## 1bis. Carte des routes & features (état local 2026-06-06)

### Routes
| Route | Rôle requis | Description |
|---|---|---|
| `/login` | public | Login seul (inscription publique désactivée) |
| `/` | auth | **Chantiers de mon agence** + recherche/filtres (titre, ville, CP, dépt, tri) |
| `/nouveau` | auth | Capture photo (caméra/galerie) |
| `/analyse/new` | auth | Analyse Gemini + **détection doublon** + édition + save (badge "saisi" si modifié à la main) |
| `/chantiers/[id]` | auth | Fiche chantier : intervenants + statut commercial + Premier contact + Planifier relance |
| `/chantiers/[id]/edit` | owner / agence | Édition complète + suppression (suppression : owner/admin) |
| `/entreprises` | auth | **Registre dédupliqué** + recherche/filtres (statut connu/inconnu, dépt, à-compléter, tri) |
| `/entreprises/[id]` | auth | Fiche entreprise éditable (coordonnées + **code client SALTI**) + chantiers + relances + historique contacts |
| `/relances` | auth | **Mes relances** : onglets "À faire" (buckets) / "Historique" + recherche |
| `/admin` | rc / chef_secteur / directeur_commercial / admin | **Supervision** : KPIs équipe + activité par commercial + derniers scans + filtres agence/commercial/période + recherche |
| `/admin/users` | admin | Gérer users (rôle, agence, **manager N+1**) + créer agences |
| `/admin/templates` | admin | CRUD templates email |
| `/api/...` | auth | analyze, chantiers (+`/check-duplicate`, `/import`, `/[id]`), entreprises/[id], relances(+[id]), contacts, templates(+[id]), admin/users(+[id]), admin/agences(+[id]) |

### Concepts clés
- **Rôles** : `commercial` < `rc` < `chef_secteur` < `directeur_commercial` < `admin`. **Tous** peuvent scanner/utiliser l'app. Les rôles managers + admin voient le menu supervision (👥 Mon équipe / 🛡 Admin).
- **Dédup & collaboration chantiers** : `dedup_key` (permis sans préfixe « PC N° », ou repli adresse+titre). 1 fiche par panneau **et par agence** (collaborative en lecture+écriture dans l'agence). Détection **dès la fin de l'analyse** (`/api/chantiers/check-duplicate`) : même agence → ouvrir la fiche commune ; autre agence → **compare-image + import** (`/api/chantiers/import`). Lien durable inter-agences via la table `panneaux` (`panneau_id`).
- **Visibilité hiérarchique** : `profiles.manager_id` forme un arbre. `can_view_profile(target)` (RLS récursive) = admin OU soi OU target dans le sous-arbre managé. Un RC voit ses commerciaux, un chef de secteur voit RC + commerciaux, etc.
- **Statut commercial** (calcul pur `src/lib/statut/compute.ts`) : inconnu / premier_contact / pas_de_reponse / relance_planifiee / converti / refus / client_salti (⭐ si code client renseigné).
- **Premier contact** : `mailto:` pré-rempli depuis un template (variables `{{raison_sociale}}`, `{{commercial_nom}}`, `{{code_client_salti}}`, `{{code_client_salti_phrase}}`, `{{code_client_salti_ps}}`, `{{chantier_titre}}`, `{{lot_numero}}`, `{{lot_intitule}}`) → log dans `contacts_envoyes`. Compatible Gmail (Google Workspace).
- **Recherche/filtres** : composants client (`*ListClient.tsx`) filtrant en mémoire, instantané, scopé par RLS selon le rôle.

### Composants/libs ajoutés
- `src/lib/templates/render.ts` (+ test), `src/lib/statut/compute.ts` (+ test), `src/lib/auth/is-admin.ts`
- `src/components/{statut-commercial-badge,premier-contact-button,planifier-relance-button,relance-card}.tsx`
- `src/app/entreprises/EntreprisesListClient.tsx`, `src/app/ChantiersListClient.tsx`, `src/app/relances/{RelancesAFaireClient,RelancesHistoClient}.tsx`, `src/app/admin/{AdminFilters,AdminChantiersList}.tsx`

---

## 2. Architecture livrée

### 2.1 Structure des fichiers

```
chantier-insight/
├── .env.example                          # template public (gitversioned)
├── .env.local                            # SECRETS (gitignoré, à recréer)
├── .nvmrc                                # → "22"
├── README.md
├── HANDOFF.md                            # ce fichier
├── package.json                          # engines.node >=22 <24
├── supabase/
│   ├── config.toml
│   └── migrations/                                    # appliquées via SQL Editor
│       ├── 20260529000001_initial_schema.sql           # tables + triggers
│       ├── 20260529000002_rls_policies.sql             # RLS owner-based
│       ├── 20260529000003_storage_bucket.sql           # bucket chantier-photos
│       ├── 20260605000001_phase5_cycle_commercial.sql  # templates, contacts_envoyes, relances
│       ├── 20260606000001_fix_templates_business.sql   # templates métier SALTI
│       ├── 20260606000002_admin_superpowers.sql        # is_admin() + RLS admin read-all
│       ├── 20260606000003_hierarchy.sql                # profiles.manager_id + can_view_profile()
│       ├── 20260606000004_role_directeur.sql           # rôle directeur_commercial
│       ├── 20260606000005_agence_code.sql              # agences.code (ex. Le Mans = MN)
│       ├── 20260606000006_seed_agences.sql             # seed 52 agences SALTI
│       ├── 20260606000007_chantier_dedup.sql           # (v1, superseded par 008/009/010)
│       ├── 20260606000008_chantier_collab_agence.sql   # dedup_key + RLS écriture agence
│       ├── 20260606000009_panneaux.sql                 # table panneaux + chantiers.panneau_id
│       └── 20260606000010_dedup_key_permis_prefix.sql  # normalisation clé permis (« PC N° »)
├── src/
│   ├── proxy.ts                          # ← Next 16 (anciennement middleware.ts)
│   ├── app/
│   │   ├── layout.tsx                    # Header + Toaster + metadata PWA
│   │   ├── page.tsx                      # accueil = liste chantiers
│   │   ├── globals.css
│   │   ├── login/page.tsx + actions.ts
│   │   ├── nouveau/page.tsx              # capture photo + upload + géoloc
│   │   ├── analyse/new/page.tsx + AnalyseClient.tsx
│   │   ├── chantiers/[id]/page.tsx       # fiche détail
│   │   ├── auth/signout/route.ts
│   │   └── api/
│   │       ├── analyze/route.ts          # → Gemini vision (Claude en backup)
│   │       └── chantiers/route.ts        # → save + dédup panneau (agence) + dédup entreprises
│   ├── components/
│   │   ├── ui/                           # shadcn (button, input, card, dialog, etc.)
│   │   ├── camera-capture.tsx
│   │   ├── chantier-card.tsx
│   │   ├── confidence-badge.tsx
│   │   └── header.tsx
│   ├── lib/
│   │   ├── supabase/{client,server,middleware}.ts
│   │   ├── ai/{claude,prompts,schema}.ts
│   │   ├── dedup/entreprise.ts
│   │   ├── image/compress.ts
│   │   └── utils.ts
│   └── types/
│       ├── database.ts                   # écrit à la main (gen CLI buggé localement)
│       └── domain.ts
├── tests/unit/
│   ├── dedup.test.ts
│   ├── ai-schema.test.ts
│   └── image-compress.test.ts
└── public/
    ├── manifest.json
    ├── icon-192.png
    └── icon-512.png
```

### 2.2 Stack technique

- **Next.js 16.2.7** (App Router · TypeScript · Turbopack)
- **Tailwind CSS 4** + **shadcn/ui** (composants pré-installés : button, input, label, card,
  avatar, dropdown-menu, dialog, textarea, badge, sonner, separator, skeleton)
- **Supabase** Frankfurt (Postgres + Auth + Storage)
- **Google Gemini 2.5 Flash** via `@google/genai` (`src/lib/ai/gemini.ts`) — Claude en backup (`src/lib/ai/claude.ts`)
- **zod** validation runtime (réponse IA)
- **Vitest** (tests unitaires : dedup, schema, image, templates, statut)

### 2.3 Décisions structurantes appliquées

- 1 codebase mobile + PC (PWA Next.js, pas natif)
- Région Frankfurt (RGPD)
- Anti-Edge runtime : `proxy.ts` tourne en Node.js runtime (depuis Next 16, défaut)
- Auth Supabase email/password — **inscription publique désactivée** : les comptes sont
  créés par l'admin (`/admin/users` via `auth.admin`), email confirmé d'office.
- Dédup **entreprises** sur (raison_sociale_normalisée, code_postal) — `normalizeRaisonSociale`
  strip les suffixes SAS/SARL/SA/EURL/SCI/SNC/SASU/SCOP.
- Dédup **chantiers (panneaux)** sur `dedup_key` = `pc:<permis sans préfixe lettres>` ou
  repli `ad:<titre|adresse|cp>` (`src/lib/dedup/chantier.ts` + `chantier-detect.ts`).
  Propriété **par agence** (1 fiche/panneau/agence) ; lien inter-agences via `panneaux`.

---

## 3. Ce qui marche (vérifié via curl)

| Test | Résultat |
|---|---|
| `GET /` (non auth) | 307 → `/login` (proxy.ts fonctionne) |
| `GET /login` | **200 en 2.5s** (page rendue avec form login/signup) |
| `GET /nouveau` (non auth) | 307 → `/login` (protégé) |
| `POST /api/analyze` (non auth) | 307 → `/login` (protégé) |
| `npx tsc --noEmit` | exit 0 (code TypeScript valide) |

---

## 4. Ce qui reste à valider (recette manuelle dans le navigateur)

À faire dans cet ordre sur http://localhost:3000 :

- [ ] **Création de compte par l'admin** : `/admin/users` → "Nouvel utilisateur" (email + mot de passe ≥ 8) ; l'inscription publique est désactivée
- [ ] **Profile** : la ligne `profiles` est créée par le trigger `handle_new_user`, puis complétée (rôle/agence/manager) par l'admin
- [ ] **Login** : le nouvel utilisateur se connecte → redirect `/`
- [ ] **Logout** : bouton "Déconnexion" du header → redirect `/login`
- [ ] **Nouveau chantier** : bouton flottant → page `/nouveau`
- [ ] **Galerie** : choisir une photo de panneau de chantier (.jpg ou .png) depuis le disque
- [ ] **Upload Storage** : vérifier dans Supabase Studio → Storage → bucket `chantier-photos`
  → dossier `<user-id>/...jpg` apparaît
- [ ] **Géoloc** : le navigateur peut demander la permission (refus OK)
- [ ] **Redirect `/analyse/new`** : page avec preview photo + "Analyse en cours…"
- [ ] **Réponse Claude** : 5–10 sec, puis les champs Projet et Intervenants se remplissent
- [ ] **Édition inline** : modifier un champ → la valeur persiste à l'écran
- [ ] **Save** : bouton "Enregistrer le chantier" → toast vert + redirect vers fiche chantier
- [ ] **Tables BDD remplies** : Supabase Studio → vérifier `chantiers`, `entreprises`,
  `chantier_intervenants` (1 chantier + N entreprises + N intervenants)
- [ ] **Dédup** : refaire le même panneau → ne doit PAS créer de nouvelles entreprises pour
  les mêmes noms
- [ ] **Retour accueil** : la card du chantier apparaît avec photo, ville, nb intervenants

Si un de ces points casse → cf. **§ 5 Gotchas** ou debug avec les logs `npm run dev`.

---

## 5. Gotchas / pièges connus

### 5.1 Node 25 fait freezer Next 16
**Symptôme** : `npm run dev` affiche "Ready in 400ms" puis "Compiling /login..." et reste là
indéfiniment, même via webpack (`--webpack`).
**Cause** : incompatibilité Node 25 ↔ Next.js 16 SWC/Turbopack.
**Fix** : Node 22 LTS (voir § 1.2).

### 5.2 Le CLI `supabase` est inutilisable localement
**Symptôme** : `npx supabase init` ou `supabase link` hangs indéfiniment.
**Workaround** :
- Les migrations ont été écrites à la main dans `supabase/migrations/`
- Elles ont été **appliquées via le SQL Editor de Supabase Studio** (copier-coller)
- `src/types/database.ts` a été **écrit à la main** (cohérent avec les migrations)
- Si tu modifies le schéma SQL, mets à jour `database.ts` manuellement OU répare le CLI sur
  le PC fixe (`npm install -g supabase` peut marcher mieux que `npx`)

### 5.3 Next 16 a renommé `middleware.ts` → `proxy.ts`
**Symptôme** : un fichier `middleware.ts` cause "must export a function named proxy".
**Fix appliqué** : on a déjà fait le rename. Si tu tombes sur de la doc ou un tuto qui
parle de `middleware.ts`, traduis vers `proxy.ts` + fonction `proxy()`.
**Doc locale** : `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`

### 5.4 Modèle Claude
Le code utilise `claude-sonnet-4-6` dans `src/lib/ai/claude.ts`. Si Anthropic renvoie
"model not found", c'est que le nom a évolué — voir https://docs.anthropic.com/en/docs/about-claude/models
pour le nom exact, et update la constante `MODEL`.

### 5.5 Email confirmation Supabase
Pour le dev, **désactiver** dans Supabase Studio → Authentication → Settings →
"Enable email confirmations". Sinon le signup envoie un mail et l'utilisateur reste
bloqué tant qu'il ne clique pas dedans.

### 5.6 Shadcn `form` ne s'installe pas
`npx shadcn add form` reste silencieux (peer-dep `react-hook-form` + React 19).
**Non-bloquant** : on utilise `<form action>` natif + server actions partout. Ajoute le
composant manuellement si besoin pour les futurs écrans.

### 5.8 `next dev` ne bloque pas sur les erreurs TypeScript — toujours `npm run build` avant push
**Symptôme** : le build Vercel échoue avec `Failed to type check` alors que tout marche en `npm run dev` et que `npx tsc --noEmit` passe.
**Cause** : `next dev` n'applique pas le type-check de manière bloquante (juste warnings). Seul `next build` (que Vercel exécute) le fait. De plus, Next 16 a son propre type-checker en plus de `tsc`, plus strict sur certains patterns.
**Bonnes pratiques** :
- **Toujours** lancer `env -u ANTHROPIC_API_KEY npm run build` avant `git push` si Vercel auto-déploie. C'est 30 sec qui évitent un échec de prod.
- Patterns connus qui passent en dev mais cassent en build :
  - Jointures Supabase avec alias (`entreprise:entreprises(...)`) ou agrégats (`chantier_intervenants(count)`) → annoter avec `.returns<TypeExplicit[]>()` (voir `src/app/page.tsx` et `src/app/chantiers/[id]/page.tsx` pour exemple).
  - `<Button asChild>` avec shadcn récent (qui utilise `@base-ui/react` au lieu de `@radix-ui/react-slot`) → utiliser `<a className={buttonVariants(...)}>` à la place.
  - Conflits de types entre `vite` (Vite 7/rolldown) racine et le `vite` interne à `vitest` → exclure `vitest.config.ts` et `tests/**` de `tsconfig.json` (le check tests reste dans `npm test`).

### 5.7 `ANTHROPIC_API_KEY` est écrasée par le shell Claude Code (dev local)
**Symptôme** : `POST /api/analyze` retourne 500 avec `Could not resolve authentication method. Expected one of apiKey, authToken, credentials, config, or profile to be set.`
**Cause** : quand on lance `npm run dev` depuis un shell intégré à Claude Code, l'environnement du process inclut déjà `ANTHROPIC_API_KEY=` (chaîne vide) injectée par le runtime Claude Code. **Node 22 `--env-file` n'écrase pas les variables déjà présentes** dans `process.env`. Résultat : `process.env.ANTHROPIC_API_KEY === ""` malgré `.env.local` correctement rempli.

**Fix dev local** :
```bash
# Au lieu de `npm run dev` :
env -u ANTHROPIC_API_KEY npm run dev
# OU le script raccourci ajouté au package.json :
npm run dev:cc
```

**Diagnostic rapide** :
```bash
node --env-file=.env.local -e "console.log('len:', (process.env.ANTHROPIC_API_KEY||'').length)"
# Si len: 0 alors que .env.local contient la clé → tu es dans ce cas
unset ANTHROPIC_API_KEY  # ou redémarrer dans un shell vierge
```

**Vercel n'est PAS impacté** : pas de var système héritée en prod, `process.env.ANTHROPIC_API_KEY` est lu depuis les Environment Variables Vercel directement.

**Note** : si tu ouvres un terminal Windows natif (PowerShell, cmd, ou Git Bash) hors de Claude Code, le problème n'existe pas non plus (sauf si tu as toi-même défini la var).

---

## 6. Comment continuer

### 6.1 État : MVP livré

Le MVP est codé, poussé et déployé. Pour repartir : appliquer les migrations sur
la base cible (§ TL;DR), faire la recette (§ 4), puis itérer sur le backlog parqué.

### 6.2 Backlog (parqué — "cas spécifiques plus tard")

Détail dans le § TL;DR > "Reste à faire". En résumé :
- **Contacts** multi-personnes par entreprise + visibilité agence + traçabilité (calqué sur la base SALTI).
- **Fusion admin** des doublons existants + **dédup robuste** (variance OCR du permis).
- **Connecteur BDD SALTI** (SIRET / code client par raison sociale).
- **Refonte fiche panneau** + **fiche intervenant** enrichie (statut + historique d'actions).
- **Email matinal des relances** (cron).

### 6.3 Roadmap globale

- ✅ **MVP** : scan → IA → fiche, collaboration agence, dédup + import inter-agence,
  cycle commercial, admin, mobile, déploiement Frankfurt.
- ⏳ **Suite** : contacts & traçabilité, connecteur SALTI, enrichissement (Sirene/Tavily),
  dashboard carte, email matinal, polish/branding.

---

## 7. Historique git de cette session

```
e658a89 chore: pin Node 22 LTS (.nvmrc + engines) — fixes Next 16 dev compile hang on Node 25
dd036be fix(next-16): migrate middleware to proxy + upgrade next 16.2.7
d2fe38e feat(phase-1): TDD libs (dedup/schema/image), Claude client, capture page, analyse, API routes, home, fiche chantier, PWA manifest
6fb40c2 feat(auth): supabase clients, middleware, login page, header, signout, database types
e9528f2 feat(db): initial schema, RLS policies, storage bucket migrations + domain types
adc2149 chore: add env template
db197b6 chore: add core dependencies (supabase, anthropic, zod, vitest)
c5d2dfa feat: setup shadcn/ui with base components
5470b1a Initial commit from Create Next App
```

## 8. Fichiers de référence à lire en premier (dans cet ordre)

1. **Ce HANDOFF.md** — l'overview
2. **`README.md`** — setup & routes
3. **`../docs/superpowers/specs/2026-05-29-chantier-insight-design.md`** — design global
   (vit dans le dossier parent `CHANTIER/`, hors du repo)
4. **`../docs/superpowers/plans/2026-05-29-chantier-insight-phase-0-1.md`** — plan
   step-by-step de ce qu'on a fait (idem, dossier parent)
5. **`src/lib/ai/prompts.ts`** — le prompt système Claude (à itérer si l'extraction déçoit)
6. **`src/lib/ai/schema.ts`** + **`src/types/domain.ts`** — la forme de la donnée extraite
7. **`supabase/migrations/`** — le schéma BDD
8. **`src/proxy.ts`** + **`src/lib/supabase/middleware.ts`** — auth flow
