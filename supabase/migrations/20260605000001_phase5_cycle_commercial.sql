-- 20260605000001_phase5_cycle_commercial.sql
-- Phase 5 : Cycle commercial — templates email, contacts envoyés, relances.

-- =====================================================
-- EMAIL TEMPLATES (gérés par admin SALTI)
-- =====================================================
create table public.email_templates (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  sujet text not null,
  corps text not null,
  type text not null check (type in ('premier_contact', 'relance', 'rdv')),
  created_by uuid references public.profiles(id) on delete set null,
  actif boolean not null default true,
  created_at timestamptz not null default now()
);

create index email_templates_type_idx on public.email_templates (type) where actif = true;

-- =====================================================
-- CONTACTS ENVOYÉS (historique par commercial)
-- =====================================================
create table public.contacts_envoyes (
  id uuid primary key default gen_random_uuid(),
  entreprise_id uuid not null references public.entreprises(id) on delete cascade,
  intervenant_id uuid references public.chantier_intervenants(id) on delete set null,
  template_id uuid references public.email_templates(id) on delete set null,
  envoye_par uuid not null references public.profiles(id) on delete cascade,
  envoye_at timestamptz not null default now(),
  sujet text not null,
  corps text not null,
  statut text not null default 'envoye' check (statut in (
    'envoye', 'repondu', 'pas_de_reponse', 'refus', 'converti'
  )),
  notes text
);

create index contacts_envoyes_par_idx on public.contacts_envoyes (envoye_par, envoye_at desc);
create index contacts_envoyes_entreprise_idx on public.contacts_envoyes (entreprise_id);

-- =====================================================
-- RELANCES (planifiées par chaque commercial pour lui-même)
-- =====================================================
create table public.relances (
  id uuid primary key default gen_random_uuid(),
  entreprise_id uuid not null references public.entreprises(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  date_relance date not null,
  motif text not null,
  chantier_id uuid references public.chantiers(id) on delete set null,
  status text not null default 'planifiee' check (status in (
    'planifiee', 'faite', 'reportee', 'annulee'
  )),
  fait_at timestamptz,
  created_at timestamptz not null default now()
);

create index relances_by_user_date_idx on public.relances (created_by, date_relance) where status = 'planifiee';

-- =====================================================
-- RLS
-- =====================================================
alter table public.email_templates enable row level security;
alter table public.contacts_envoyes enable row level security;
alter table public.relances enable row level security;

-- email_templates : tous lisent (actifs uniquement). Écriture restreinte côté API via requireAdmin.
create policy "templates_authenticated_select" on public.email_templates
  for select using (auth.role() = 'authenticated' and actif = true);

-- contacts_envoyes : owner-based
create policy "contacts_owner_select" on public.contacts_envoyes
  for select using (auth.uid() = envoye_par);
create policy "contacts_owner_insert" on public.contacts_envoyes
  for insert with check (auth.uid() = envoye_par);
create policy "contacts_owner_update" on public.contacts_envoyes
  for update using (auth.uid() = envoye_par);

-- relances : owner-based
create policy "relances_owner_select" on public.relances
  for select using (auth.uid() = created_by);
create policy "relances_owner_insert" on public.relances
  for insert with check (auth.uid() = created_by);
create policy "relances_owner_update" on public.relances
  for update using (auth.uid() = created_by);
create policy "relances_owner_delete" on public.relances
  for delete using (auth.uid() = created_by);

-- =====================================================
-- TEMPLATES PAR DÉFAUT (seeds — admin peut éditer après)
-- =====================================================
insert into public.email_templates (nom, sujet, corps, type, actif) values
(
  'Premier contact — Maîtrise d''œuvre',
  'SALTI - Présentation à {{raison_sociale}} pour le chantier {{chantier_titre}}',
  E'Bonjour,\n\nJe suis {{commercial_nom}}, commercial chez SALTI{{code_client_salti_phrase}}.\n\nJ''ai vu que {{raison_sociale}} intervient en tant que maître d''œuvre sur le chantier "{{chantier_titre}}".\n\nSALTI fabrique et distribue des matériaux de construction de qualité (dalles, charpente, isolation...). Nous serions ravis de vous présenter notre offre adaptée à votre projet.\n\nAuriez-vous quelques minutes cette semaine pour un échange téléphonique ?\n\nBien cordialement,\n{{commercial_nom}}\nSALTI',
  'premier_contact',
  true
),
(
  'Premier contact — Entreprise du lot',
  'SALTI - Solutions pour {{lot_intitule}} sur {{chantier_titre}}',
  E'Bonjour,\n\nJe suis {{commercial_nom}}, commercial chez SALTI{{code_client_salti_phrase}}.\n\nJ''ai vu que {{raison_sociale}} intervient sur le lot {{lot_numero}} ({{lot_intitule}}) du chantier "{{chantier_titre}}".\n\nSALTI propose une large gamme de matériaux adaptés à ce type de prestation. Pouvons-nous échanger pour vous présenter notre offre ?\n\nBien cordialement,\n{{commercial_nom}}\nSALTI',
  'premier_contact',
  true
),
(
  'Relance commerciale',
  'Relance - Suite à notre échange',
  E'Bonjour,\n\nJe vous recontacte suite à notre dernier échange concernant votre intervention sur {{chantier_titre}}.\n\nAvez-vous eu le temps de regarder notre offre ? Je reste à votre disposition pour répondre à vos questions.\n\nBien cordialement,\n{{commercial_nom}}\nSALTI',
  'relance',
  true
);
