-- supabase/migrations/20260529000001_initial_schema.sql

-- AGENCES
create table public.agences (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  ville text,
  created_at timestamptz not null default now()
);

-- PROFILES (étend auth.users)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  nom text,
  prenom text,
  role text not null default 'commercial' check (role in ('commercial', 'rc', 'chef_secteur', 'admin')),
  agence_id uuid references public.agences(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Trigger : créer un profile automatiquement à l'inscription
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ENTREPRISES (registre dédupliqué)
create table public.entreprises (
  id uuid primary key default gen_random_uuid(),
  siret text unique,
  raison_sociale text not null,
  raison_sociale_normalisee text not null,
  ville text,
  code_postal text,
  adresse text,
  telephone text,
  email text,
  site_web text,
  code_client_salti text,
  source_info jsonb not null default '{}'::jsonb,
  enrichi_at timestamptz,
  created_at timestamptz not null default now()
);

create index entreprises_siret_idx on public.entreprises (siret);
create index entreprises_normalisee_idx on public.entreprises (raison_sociale_normalisee, code_postal);

-- CHANTIERS
create table public.chantiers (
  id uuid primary key default gen_random_uuid(),
  titre text not null,
  adresse text,
  ville text,
  code_postal text,
  latitude double precision,
  longitude double precision,
  permis_construire text,
  date_pc date,
  montant_travaux_ht numeric,
  photo_principale_url text not null,
  status text not null default 'actif' check (status in ('actif', 'archive')),
  notes text,
  created_by uuid not null references public.profiles(id) on delete cascade,
  agence_id uuid references public.agences(id) on delete set null,
  ia_raw_json jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index chantiers_created_by_idx on public.chantiers (created_by);
create index chantiers_created_at_idx on public.chantiers (created_at desc);

-- CHANTIER_INTERVENANTS
create table public.chantier_intervenants (
  id uuid primary key default gen_random_uuid(),
  chantier_id uuid not null references public.chantiers(id) on delete cascade,
  entreprise_id uuid not null references public.entreprises(id) on delete restrict,
  role text not null check (role in (
    'maitrise_ouvrage', 'maitrise_ouvrage_mandataire',
    'architecte', 'maitre_oeuvre', 'economiste',
    'be_structure', 'be_fluides', 'be_electricite',
    'be_vrd', 'be_acoustique',
    'controle', 'sps', 'opc', 'lot'
  )),
  lot_numero text,
  lot_intitule text,
  rang int not null default 1 check (rang in (1, 2)),
  source_info jsonb not null default '{}'::jsonb,
  ordre int,
  created_at timestamptz not null default now()
);

create index chantier_intervenants_chantier_idx on public.chantier_intervenants (chantier_id);
create index chantier_intervenants_entreprise_idx on public.chantier_intervenants (entreprise_id);

-- TRIGGER updated_at
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger chantiers_updated_at
  before update on public.chantiers
  for each row execute function public.set_updated_at();
