-- 20260606000014_intervenant_suivi.sql
-- #44 : statut de suivi MANUEL « où j'en suis » d'un intervenant (entreprise)
-- SUR un chantier. Le deal se gagne/perd chantier par chantier (EIFFAGE peut
-- être "Gagné" sur l'un, "Devis envoyé" sur l'autre) → clé (chantier, entreprise).
-- Partagé au niveau AGENCE (collaboratif). Sélection LIBRE des statuts.
-- Stocké à part de chantier_intervenants car celui-ci est recréé à chaque
-- édition du chantier (on perdrait le statut).

create table if not exists public.intervenant_suivi (
  id uuid primary key default gen_random_uuid(),
  chantier_id uuid not null references public.chantiers(id) on delete cascade,
  entreprise_id uuid not null references public.entreprises(id) on delete cascade,
  agence_id uuid references public.agences(id) on delete set null,
  statut text not null check (statut in (
    'a_contacter','contacte','relance_envoyee','rdv_pris',
    'devis_envoye','negociation','gagne','perdu'
  )),
  note text,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (chantier_id, entreprise_id)
);

create index if not exists intervenant_suivi_chantier_idx on public.intervenant_suivi (chantier_id);
create index if not exists intervenant_suivi_entreprise_idx on public.intervenant_suivi (entreprise_id);
create index if not exists intervenant_suivi_agence_idx on public.intervenant_suivi (agence_id);

create trigger intervenant_suivi_updated_at
  before update on public.intervenant_suivi
  for each row execute function public.set_updated_at();

-- RLS : lecture + écriture au niveau agence (collaboratif) OU admin.
alter table public.intervenant_suivi enable row level security;

create policy "intervenant_suivi_select" on public.intervenant_suivi
  for select using (
    public.is_admin()
    or (agence_id is not null
        and agence_id = (select agence_id from public.profiles where id = auth.uid()))
  );
create policy "intervenant_suivi_insert" on public.intervenant_suivi
  for insert with check (
    public.is_admin()
    or (agence_id is not null
        and agence_id = (select agence_id from public.profiles where id = auth.uid()))
  );
create policy "intervenant_suivi_update" on public.intervenant_suivi
  for update using (
    public.is_admin()
    or (agence_id is not null
        and agence_id = (select agence_id from public.profiles where id = auth.uid()))
  );
create policy "intervenant_suivi_delete" on public.intervenant_suivi
  for delete using (
    public.is_admin()
    or (agence_id is not null
        and agence_id = (select agence_id from public.profiles where id = auth.uid()))
  );
