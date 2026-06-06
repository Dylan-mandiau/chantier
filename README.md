# Chantier Insight — SALTI

PWA pour les commerciaux SALTI (loueur de matériel de levage & élévation) :
photographier un panneau de chantier, extraire automatiquement les sociétés
intervenantes via IA de vision, alimenter un registre d'entreprises dédupliqué,
et piloter le cycle commercial (premier contact, relances).

**Repo** : https://github.com/Dylan-mandiau/chantier
**Statut** : **MVP complet, déployé** (Vercel, région Frankfurt). Voir
[`HANDOFF.md`](./HANDOFF.md) pour l'état détaillé, les migrations SQL et les écueils.
**IA de vision** : Google **Gemini 2.5 Flash** (`src/lib/ai/gemini.ts`). Claude
dispo en backup (`src/lib/ai/claude.ts`).

## ✨ Fonctionnalités (MVP)

- **Scan panneau → IA → fiche chantier** : analyse Gemini, édition inline, badges de confiance.
- **Collaboration par agence** : 1 fiche par panneau et par agence, partagée et
  éditable entre collègues d'agence (RLS).
- **Déduplication des panneaux** : détection (dès la fin de l'analyse) d'un même
  panneau via le permis de construire (préfixe « PC N° » ignoré) ou, à défaut,
  l'adresse + le titre. Lien durable inter-agences (table `panneaux`).
- **Import inter-agence** : si une autre agence a déjà la fiche, comparaison par
  photo puis import des données vérifiées dans sa propre agence (pas de re-saisie).
- **Registre Entreprises** global dédupliqué (raison sociale normalisée + CP),
  fiche éditable (coordonnées + code client SALTI).
- **Cycle commercial** : premier contact (mail pré-rempli via template), relances,
  statut commercial calculé.
- **Admin** : CRUD utilisateurs (rôle, agence, manager N+1, mot de passe), agences,
  templates email, dashboard supervision + filtres, hiérarchie de visibilité.
- **Mobile** : menu hamburger ; inscription publique désactivée (comptes créés par l'admin).

## 🚀 Démarrage en local

```bash
git clone https://github.com/Dylan-mandiau/chantier.git chantier-insight
cd chantier-insight
nvm use            # lit .nvmrc → Node 22 LTS (REQUIS, cf. § "Node version")
npm install
cp .env.example .env.local   # puis renseigner les clés réelles
npm run dev:cc     # = `env -u ANTHROPIC_API_KEY npm run dev` (cf. HANDOFF § 5.7)
```

Ouvrir http://localhost:3000.

## 🛑 Node version — IMPORTANT

Ce projet **exige Node 22 LTS**. Next.js 16 + Turbopack/webpack se bloque à la compilation sur Node 25.

- `.nvmrc` fixe la version → `nvm use` ou `fnm use` la prend
- `engines` dans `package.json` la documente
- Windows : installer le MSI Node 22 LTS depuis nodejs.org

## 🔑 Variables d'environnement requises

Toutes dans `.env.local` (gitignoré) :

| Var | Source | Sensibilité |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Studio → Settings → API | public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | idem | public |
| `SUPABASE_SERVICE_ROLE_KEY` | idem | 🔒 SECRET (server only) — `createAdminClient()` |
| `SUPABASE_PROJECT_ID` | Settings → General → Reference ID | semi-public |
| `GOOGLE_API_KEY` | aistudio.google.com/apikey | 🔒 SECRET — **IA de vision active** |
| `ANTHROPIC_API_KEY` | console.anthropic.com | 🔒 SECRET — backup, non utilisé par défaut |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` en dev | public |

## 🧱 Stack

- **Next.js 16.2.7** (App Router, TypeScript, Turbopack) — PWA
- **Tailwind CSS 4** + **shadcn/ui** (base sur `@base-ui/react`)
- **Supabase** (Postgres + Auth + Storage, région **Frankfurt** RGPD)
- **Google Gemini 2.5 Flash** (extraction vision) — Claude en backup
- **zod** validation runtime
- **Vitest** tests unitaires
- **Node 22 LTS** runtime

## 🗄️ Base de données

Migrations dans `supabase/migrations/`, appliquées via le SQL Editor Supabase (dans l'ordre) :

| Migration | Contenu |
|---|---|
| `20260529000001_initial_schema` | agences, profiles, entreprises, chantiers, intervenants + triggers |
| `20260529000002_rls_policies` | RLS owner-based + lecture authentifiée |
| `20260529000003_storage_bucket` | bucket `chantier-photos` + RLS per-user |
| `20260605000001_phase5_cycle_commercial` | templates, contacts_envoyes, relances |
| `20260606000001_fix_templates_business` | templates métier SALTI (levage/élévation) |
| `20260606000002_admin_superpowers` | `is_admin()` + RLS admin read-all |
| `20260606000003_hierarchy` | `profiles.manager_id` + `can_view_profile()` |
| `20260606000004_role_directeur` | rôle `directeur_commercial` |
| `20260606000005_agence_code` | `agences.code` (code court, ex. Le Mans = MN) |
| `20260606000006_seed_agences` | seed des 52 agences SALTI |
| `20260606000008_chantier_collab_agence` | `chantiers.dedup_key` + RLS écriture agence |
| `20260606000009_panneaux` | table `panneaux` (lien durable) + `chantiers.panneau_id` |
| `20260606000010_dedup_key_permis_prefix` | normalisation clé permis (préfixe « PC N° ») |

> `types/database.ts` est écrit à la main (CLI Supabase buggé en local) — à synchroniser
> manuellement après chaque migration.

⚠️ **Confirmation email désactivée** dans Supabase Studio → Authentication (comptes créés par l'admin).

## 🛣️ Routes principales

| Route | Description |
|---|---|
| `/login` | Login seul (inscription publique désactivée) |
| `/` | **Chantiers de mon agence** + recherche/filtres |
| `/nouveau` | Capture photo (caméra/galerie) + upload |
| `/analyse/new` | Analyse Gemini + détection doublon + édition + save |
| `/chantiers/[id]` (+ `/edit`) | Fiche chantier + premier contact + relance + édition/suppression |
| `/entreprises` (+ `/[id]`) | Registre dédupliqué + fiche éditable |
| `/relances` | Mes relances (à faire / historique) |
| `/admin` | Supervision (managers/admin) |
| `/admin/users` · `/admin/templates` | Admin (CRUD users/agences, templates) |
| `/api/chantiers` · `/check-duplicate` · `/import` · `/[id]` | Save, détection précoce, import inter-agence, edit/delete |
| `/api/analyze` · `/entreprises/[id]` · `/relances` · `/contacts` · `/templates` · `/admin/*` | API |

**Proxy** : `src/proxy.ts` (Next 16 a renommé `middleware.ts` → `proxy.ts`) — refresh
session Supabase + redirect `/login` si non authentifié.

## 🧪 Tests & build

```bash
npm test                                   # vitest (dedup, schema, image, templates, statut)
env -u ANTHROPIC_API_KEY npm run build     # TOUJOURS avant un push (Vercel auto-déploie)
```

## 🚢 Déploiement Vercel

1. Import GitHub `Dylan-mandiau/chantier` (Framework : Next.js auto-détecté)
2. **Settings → Functions → Region : Frankfurt (fra1)** ← critique RGPD
3. Environment Variables : ajouter toutes les vars de `.env.local` (dont `SUPABASE_SERVICE_ROLE_KEY` et `GOOGLE_API_KEY`)
4. Appliquer les migrations SQL non encore passées dans Supabase
5. Deploy (Node 22 lu depuis `engines`)

## ✍️ Itérer sur l'extraction IA

Le prompt est dans `src/lib/ai/prompts.ts`. Si l'extraction échoue sur certains panneaux :
**ne pas changer le code**, ajuster uniquement le prompt, re-tester, puis
`tune(prompt): …`.

## 📋 Roadmap

- ✅ MVP : scan → IA → fiche, collaboration agence, dédup + import inter-agence,
  cycle commercial, admin, mobile.
- ✅ Identité & UX (audit) : design system SALTI (jaune #FFDD00 + logo + typo),
  en-tête refait + **barre de nav mobile** (Scanner central, safe-area), format PC
  (grilles multi-colonnes), fiche chantier (photo compacte + tri Clients SALTI /
  Inconnus), retour contextuel, **confirmation anti-tapotage** avant Appeler/Mailer.
- ⏳ Suite (backlog #36-#47, voir HANDOFF) : Contacts multi-personnes + traçabilité,
  page Entreprises (puces + actions inline), ludification (dashboard perso),
  fusion des doublons (admin), connecteur BDD SALTI (SIRET/code client), dédup
  robuste (variance OCR), email matinal des relances.

## 🔄 Reprise du travail

Voir [`HANDOFF.md`](./HANDOFF.md) (état actuel, migrations, écueils connus).
