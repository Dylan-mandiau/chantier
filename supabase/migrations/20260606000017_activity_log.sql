-- 20260606000017_activity_log.sql
-- #49 (Lot A) : journal d'activité centralisé. Trace les événements clés du
-- site : connexions, scans, éditions, changements de suivi, vérifications,
-- fusions… (qui · quoi · quand · sur quelle entité). Écriture via service_role
-- (helper logActivity) ; lecture réservée admin.

create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  agence_id uuid,
  action text not null,      -- connexion, scan, edit_chantier, suivi, verifie, fusion, ...
  entite text,               -- auth, chantier, entreprise, contact, relance
  entite_id uuid,
  libelle text,              -- description lisible
  created_at timestamptz not null default now()
);

create index if not exists activity_log_created_idx on public.activity_log (created_at desc);
create index if not exists activity_log_user_idx on public.activity_log (user_id);
create index if not exists activity_log_action_idx on public.activity_log (action);

alter table public.activity_log enable row level security;

-- Lecture réservée admin (le journal est admin-only). Écriture via service_role.
create policy "activity_log_select_admin" on public.activity_log
  for select using (public.is_admin());
