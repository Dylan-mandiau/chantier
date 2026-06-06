# Chantier Insight — SALTI

PWA pour les commerciaux SALTI : photographier un panneau de chantier, extraire automatiquement les sociétés intervenantes via Claude Vision, et alimenter un registre dédupliqué.

**Repo** : https://github.com/Dylan-mandiau/chantier
**Statut** : Phase 0 + 1 en prod (tag `v0.1.2`). Phase 5 cycle commercial + Entreprises + Admin/supervision + hiérarchie + recherche/filtres = codés en local (non poussés). Voir [`HANDOFF.md`](./HANDOFF.md) § TL;DR pour l'état précis + les migrations SQL à appliquer.
**IA de vision** : Google Gemini 2.5 Flash (`src/lib/ai/gemini.ts`). Claude dispo en backup (`src/lib/ai/claude.ts`).

## 🚀 Démarrage en local

```bash
git clone https://github.com/Dylan-mandiau/chantier.git chantier-insight
cd chantier-insight
nvm use            # lit .nvmrc → Node 22 LTS (REQUIS, cf. § "Node version")
npm install
cp .env.example .env.local   # puis renseigner les clés réelles
npm run dev
```

Ouvrir http://localhost:3000.

## 🛑 Node version — IMPORTANT

Ce projet **exige Node 22 LTS**. Next.js 16 + Turbopack/webpack se bloque à la compilation sur Node 25.

- `.nvmrc` fixe la version → `nvm use` ou `fnm use` la prend
- `engines` dans `package.json` la documente
- Sans gestionnaire de versions sur macOS Homebrew :
  ```bash
  brew install node@22
  brew unlink node && brew link --overwrite node@22
  node --version   # doit afficher v22.x
  ```

## 🔑 Variables d'environnement requises

Toutes dans `.env.local` (gitignoré) :

| Var | Source | Sensibilité |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Studio → Settings → API | public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | idem | public |
| `SUPABASE_SERVICE_ROLE_KEY` | idem | 🔒 SECRET (server only) |
| `SUPABASE_PROJECT_ID` | Settings → General → Reference ID | semi-public |
| `ANTHROPIC_API_KEY` | console.anthropic.com → API Keys | 🔒 SECRET |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` en dev | public |

## 🧱 Stack

- **Next.js 16.2.7** (App Router, TypeScript, Turbopack) — PWA
- **Tailwind CSS 4** + **shadcn/ui**
- **Supabase** (Postgres + Auth + Storage, région **Frankfurt** RGPD)
- **Anthropic Claude Sonnet 4.6** (extraction vision)
- **zod** validation runtime
- **Vitest** tests unitaires
- **Node 22 LTS** runtime

## 🗄️ Base de données

Les 3 migrations dans `supabase/migrations/` ont été appliquées via le SQL Editor Supabase :

1. `20260529000001_initial_schema.sql` — tables (agences, profiles, entreprises, chantiers, intervenants) + triggers `handle_new_user` (auto-création profile) + `set_updated_at`
2. `20260529000002_rls_policies.sql` — RLS owner-based + lecture authentifiée
3. `20260529000003_storage_bucket.sql` — bucket `chantier-photos` 5MB + RLS per-user folder

⚠️ **Confirmation email désactivée pour le dev** dans Supabase Studio → Authentication → Settings (à réactiver en prod).

## 🛣️ Routes

| Route | Type | Description |
|---|---|---|
| `/` | RSC | Liste chantiers (owner) — redirige `/login` si non auth |
| `/login` | Client | Login + signup toggle (server actions) |
| `/auth/signout` | POST route | Déconnexion |
| `/nouveau` | Client | Capture photo (caméra/galerie) + compression + upload Storage |
| `/analyse/new?photo=…` | RSC + Client | Analyse Claude + édition + save |
| `/chantiers/[id]` | RSC | Fiche chantier (photo, intervenants, contacts) |
| `/api/analyze` | POST | Appel Claude vision (auth via cookie Supabase) |
| `/api/chantiers` | POST | Save chantier + intervenants + dédup entreprises |

**Proxy / middleware** : `src/proxy.ts` (en Next.js 16, `middleware.ts` est renommé `proxy.ts`).
Refresh de session Supabase + redirect vers `/login` si non authentifié.

## 🧪 Tests

```bash
npm test           # vitest run (3 fichiers : dedup, schema, image)
npm run test:watch # mode watch
npm run test:e2e   # Playwright (à configurer dans une future phase)
```

## 🚢 Déploiement Vercel

1. Vercel → Add New → Project → Import GitHub (repo `Dylan-mandiau/chantier`)
2. Framework Preset : Next.js (auto-détecté)
3. **Settings → Functions → Region : Frankfurt (fra1)** ← critique RGPD
4. Environment Variables : ajouter les 6 vars de `.env.local`
5. Deploy

Node 22 sera utilisé automatiquement (lu depuis `engines` dans `package.json`).

## ✍️ Itérer sur l'extraction Claude

Le prompt est dans `src/lib/ai/prompts.ts`. Si l'extraction échoue sur certains panneaux :
- **Ne pas changer le code**
- Modifier uniquement le prompt
- Re-tester sur les panneaux de référence
- Commit : `tune(prompt): améliore détection rang 2`

## 📋 Phases

- ✅ **Phase 0** : setup, infra, déploiement
- ✅ **Phase 1** : MVP minimal extractif (photo → IA → save)
- ⏳ **Phase 2** : consultation, recherche, fiche enrichie
- ⏳ **Phase 3** : enrichissement (Sirene + Tavily)
- ⏳ **Phase 4** : dashboard PC + carte interactive
- ⏳ **Phase 5** : cycle commercial (templates email + relances)
- ⏳ **Phase 6** : polish, branding SALTI

Voir `../docs/superpowers/specs/2026-05-29-chantier-insight-design.md` pour le design complet
(dans le dossier parent `CHANTIER/`, hors du repo Git).

## 🔄 Reprise du travail

Voir [`HANDOFF.md`](./HANDOFF.md) pour reprendre le projet sur une autre machine (état actuel,
ce qui reste à faire, écueils connus).
