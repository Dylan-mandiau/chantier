# Chantier Insight — SALTI

PWA pour les commerciaux SALTI : photographier un panneau de chantier, extraire automatiquement les sociétés intervenantes via Claude Vision, et alimenter un registre dédupliqué.

## 🚀 Démarrage en local

```bash
cd chantier-insight
npm install
cp .env.example .env.local   # puis renseigner les clés réelles
npm run dev
```

Ouvrir http://localhost:3000.

## 🔑 Variables d'environnement requises

Toutes dans `.env.local` (gitignoré) :

| Var | Source | Sensibilité |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Studio → Settings → API | public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | idem | public |
| `SUPABASE_SERVICE_ROLE_KEY` | idem | 🔒 SECRET (server only) |
| `SUPABASE_PROJECT_ID` | Settings → General → Reference ID | semi-public |
| `ANTHROPIC_API_KEY` | console.anthropic.com → API Keys | 🔒 SECRET |

## 🧱 Stack

- **Next.js 16** (App Router, TypeScript) — PWA
- **Tailwind CSS 4** + **shadcn/ui**
- **Supabase** (Postgres + Auth + Storage, région Frankfurt)
- **Anthropic Claude Sonnet 4.6** (extraction vision)
- **zod** validation runtime
- **Vitest** tests unitaires (compatible Node 20 LTS)

## 🗄️ Base de données

Les 3 migrations dans `supabase/migrations/` ont été appliquées via le SQL Editor Supabase :

1. `20260529000001_initial_schema.sql` — tables (agences, profiles, entreprises, chantiers, intervenants) + triggers
2. `20260529000002_rls_policies.sql` — RLS owner-based + lecture authentifiée
3. `20260529000003_storage_bucket.sql` — bucket `chantier-photos` 5MB + RLS per-user folder

⚠️ **Confirmation email désactivée pour le dev** dans Supabase Studio → Authentication → Settings (à réactiver en prod).

## 🛣️ Routes

| Route | Type | Description |
|---|---|---|
| `/` | RSC | Liste chantiers (owner) — redirige `/login` si non auth |
| `/login` | Client | Login + signup toggle |
| `/auth/signout` | POST | Déconnexion |
| `/nouveau` | Client | Capture photo (caméra/galerie) + upload Storage |
| `/analyse/new?photo=…` | RSC + Client | Analyse Claude + édition + save |
| `/chantiers/[id]` | RSC | Fiche chantier (photo, intervenants, contacts) |
| `/api/analyze` | POST | Appel Claude vision (Bearer auth Supabase) |
| `/api/chantiers` | POST | Save chantier + intervenants + dédup entreprises |

## 🧪 Tests

```bash
npm test           # vitest run
npm run test:watch # mode watch
npm run test:e2e   # Playwright (à configurer)
```

⚠️ Si vitest se bloque (Node 25 + workers), tester avec :
```bash
./node_modules/.bin/vitest run --pool=threads --poolOptions.threads.singleThread=true
```
Pour fiabilité maximale : utiliser Node 22 LTS (`nvm use 22`).

## 🚢 Déploiement Vercel

1. Push sur GitHub (repo `chantier-insight`, privé)
2. Vercel → Add New → Project → Import GitHub
3. **Settings → Functions → Region : Frankfurt (fra1)** (RGPD)
4. Ajouter toutes les variables `.env.local` dans Vercel → Environment Variables
5. Deploy

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

Voir `../docs/superpowers/specs/2026-05-29-chantier-insight-design.md` pour le design complet.
