# Handoff — Chantier Insight

> Document de reprise pour continuer le projet sur une autre machine (PC fixe), ou pour
> qu'un autre développeur / agent IA s'y mette. **Dernière mise à jour : 2026-06-04.**

---

## TL;DR

- **30/31 tâches livrées** (Phase 0 setup + Phase 1 MVP minimal extractif)
- **9 commits** sur `main`, poussés à https://github.com/Dylan-mandiau/chantier
- **Code testé via curl** : `/login` → 200, `/` → 307 redirect (proxy auth OK)
- **Pas encore testé manuellement** dans le navigateur (signup → photo → analyse → save)
- **Reste à faire** :
  1. Recette manuelle du parcours complet (Phase 1 critère de sortie)
  2. Déploiement Vercel (T7 — la dernière tâche de Phase 0)
  3. Phase 2+ (consultation, enrichissement, dashboard PC, cycle commercial, polish)

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
| `SUPABASE_SERVICE_ROLE_KEY` | clé JWT `service_role` (idem, **secret**) |
| `ANTHROPIC_API_KEY` | `sk-ant-...` (console.anthropic.com → API Keys) |
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
│   └── migrations/
│       ├── 20260529000001_initial_schema.sql       ✅ appliquée
│       ├── 20260529000002_rls_policies.sql         ✅ appliquée
│       └── 20260529000003_storage_bucket.sql       ✅ appliquée
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
│   │       ├── analyze/route.ts          # → Claude vision
│   │       └── chantiers/route.ts        # → save BDD + dédup entreprises
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
- **Anthropic Claude Sonnet 4.6** via `@anthropic-ai/sdk`
- **zod** validation runtime (réponse Claude)
- **Vitest** (3 fichiers de tests unitaires)

### 2.3 Décisions structurantes appliquées

- 1 codebase mobile + PC (PWA Next.js, pas natif)
- Région Frankfurt (RGPD)
- Anti-Edge runtime : `proxy.ts` tourne en Node.js runtime (depuis Next 16, défaut)
- Auth Supabase email/password (signup activé, **email confirmation désactivée** pour le dev)
- Dédup entreprises sur (raison_sociale_normalisée, code_postal) — la fonction
  `normalizeRaisonSociale` strip les suffixes SAS/SARL/SA/EURL/SCI/SNC/SASU/SCOP

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

- [ ] **Signup** : email + password ≥ 8 caractères → redirect vers `/`
- [ ] **Profile auto-créé** : vérifier dans Supabase Studio → Table Editor → `profiles` qu'une
  ligne avec ton email apparaît (créée par le trigger `handle_new_user`)
- [ ] **Logout** : bouton "Déconnexion" du header → redirect `/login`
- [ ] **Login** : retour avec les mêmes credentials → redirect `/`
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

### 6.1 Étape immédiate : terminer la Phase 0/1

1. Faire la recette manuelle (§ 4) sur le PC fixe
2. Si un bug : debug → patch → commit → push
3. **T7 — Déploiement Vercel** :
   - Aller sur https://vercel.com → Add New → Project → Import GitHub `Dylan-mandiau/chantier`
   - Framework Preset : Next.js (auto)
   - **Region : Frankfurt (fra1)** (Settings → Functions)
   - Ajouter les 6 vars d'env (mêmes valeurs que `.env.local`)
   - Deploy
   - Tester depuis ton téléphone (URL https://chantier-xxx.vercel.app)
   - Tag : `git tag -a v0.1.0 -m "Phase 1 MVP minimal extractif" && git push origin v0.1.0`

### 6.2 Étape suivante : Phase 2 — Consultation (≈ 1 semaine)

D'après le spec design (`docs/superpowers/specs/2026-05-29-chantier-insight-design.md`) :
- Liste chantiers (mobile cards + PC grille)
- Fiche chantier consultation + édition
- Recherche basique (titre, ville)
- Actions Appeler/Email actives (`tel:` / `mailto:`)

À écrire avec un nouveau plan via `superpowers:writing-plans` → fichier `docs/superpowers/plans/2026-XX-XX-chantier-insight-phase-2.md`.

### 6.3 Roadmap globale

- ✅ **Phase 0** : setup, infra
- ✅ **Phase 1** : MVP photo → IA → save (cette session)
- ⏳ **Phase 2** : consultation, recherche
- ⏳ **Phase 3** : enrichissement (Sirene + Tavily, scores de confiance)
- ⏳ **Phase 4** : dashboard PC + carte Leaflet
- ⏳ **Phase 5** : cycle commercial (templates email + relances + email matinal)
- ⏳ **Phase 6** : polish, branding SALTI, perf, doc utilisateur

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
