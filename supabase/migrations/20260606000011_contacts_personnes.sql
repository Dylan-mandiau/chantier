-- 20260606000011_contacts_personnes.sql
-- #39-41 : Contacts (personnes) rattachés à une entreprise.
-- Additif : l'entreprise garde son tél/email "standard" ; on ajoute ici les
-- interlocuteurs nommés (un client peut avoir N contacts, cf base SALTI).
-- Visibilité AGENCE (comme chantiers) + traçabilité des modifications.

-- 1. Table des contacts (personnes)
create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  entreprise_id uuid not null references public.entreprises(id) on delete cascade,
  agence_id uuid references public.agences(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  prenom text,
  nom text,
  fonction text,                 -- rôle / service (chef de chantier, conducteur de travaux, BE...)
  telephone text,                -- fixe
  telephone_portable text,
  email text,
  compte_extranet boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists contacts_entreprise_idx on public.contacts (entreprise_id);
create index if not exists contacts_agence_idx on public.contacts (agence_id);

create trigger contacts_updated_at
  before update on public.contacts
  for each row execute function public.set_updated_at();

-- 2. Traçabilité : une ligne par action (création / modification / suppression).
--    `changements` = { champ: { avant, apres } }. contact_id en SET NULL pour
--    conserver l'historique même après suppression du contact.
create table if not exists public.contact_modifications (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid references public.contacts(id) on delete set null,
  entreprise_id uuid references public.entreprises(id) on delete cascade,
  agence_id uuid,
  modifie_par uuid references public.profiles(id) on delete set null,
  contact_label text,            -- "Prénom NOM" au moment de l'action (lisible après suppression)
  action text not null check (action in ('creation', 'modification', 'suppression')),
  changements jsonb not null default '{}'::jsonb,
  modifie_at timestamptz not null default now()
);

create index if not exists contact_modifications_contact_idx on public.contact_modifications (contact_id);
create index if not exists contact_modifications_entreprise_idx on public.contact_modifications (entreprise_id);

-- 3. RLS — visibilité AGENCE + admin (comme les chantiers).
alter table public.contacts enable row level security;
alter table public.contact_modifications enable row level security;

-- Lecture : même agence OU admin.
create policy "contacts_select" on public.contacts
  for select using (
    public.is_admin()
    or (agence_id is not null
        and agence_id = (select agence_id from public.profiles where id = auth.uid()))
  );

-- Écriture (insert/update/delete) : même agence OU admin.
create policy "contacts_insert" on public.contacts
  for insert with check (
    public.is_admin()
    or (agence_id is not null
        and agence_id = (select agence_id from public.profiles where id = auth.uid()))
  );
create policy "contacts_update" on public.contacts
  for update using (
    public.is_admin()
    or (agence_id is not null
        and agence_id = (select agence_id from public.profiles where id = auth.uid()))
  );
create policy "contacts_delete" on public.contacts
  for delete using (
    public.is_admin()
    or (agence_id is not null
        and agence_id = (select agence_id from public.profiles where id = auth.uid()))
  );

-- Audit : lecture même agence OU admin (l'écriture se fait via service_role côté API).
create policy "contact_modifications_select" on public.contact_modifications
  for select using (
    public.is_admin()
    or (agence_id is not null
        and agence_id = (select agence_id from public.profiles where id = auth.uid()))
  );
