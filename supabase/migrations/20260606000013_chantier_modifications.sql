-- 20260606000013_chantier_modifications.sql
-- Traçabilité des modifications d'un chantier : qui a changé quoi, valeur
-- AVANT -> APRÈS, et quand. Même motif que contact_modifications (#41).
--   action : creation (scan), modification (édition), import (inter-agence),
--            suppression.
--   changements = { champ: { avant, apres } }.
-- chantier_id / panneau_id en SET NULL pour conserver l'historique même après
-- suppression de la fiche. Écriture via service_role côté API (pas de policy
-- insert) ; lecture au niveau agence + admin.

create table if not exists public.chantier_modifications (
  id uuid primary key default gen_random_uuid(),
  chantier_id uuid references public.chantiers(id) on delete set null,
  panneau_id uuid references public.panneaux(id) on delete set null,
  agence_id uuid,
  modifie_par uuid references public.profiles(id) on delete set null,
  chantier_titre text,           -- titre au moment de l'action (lisible après suppression)
  action text not null check (action in ('creation', 'modification', 'import', 'suppression')),
  changements jsonb not null default '{}'::jsonb,
  modifie_at timestamptz not null default now()
);

create index if not exists chantier_modifications_chantier_idx
  on public.chantier_modifications (chantier_id);
create index if not exists chantier_modifications_panneau_idx
  on public.chantier_modifications (panneau_id);
create index if not exists chantier_modifications_agence_idx
  on public.chantier_modifications (agence_id);

alter table public.chantier_modifications enable row level security;

-- Lecture : même agence OU admin (l'écriture se fait via service_role côté API).
create policy "chantier_modifications_select" on public.chantier_modifications
  for select using (
    public.is_admin()
    or (agence_id is not null
        and agence_id = (select agence_id from public.profiles where id = auth.uid()))
  );
