-- 20260606000016_kpi_objectifs.sql
-- #51 P2 : objectifs chiffrés activables pour le dashboard KPI direction.
-- L'admin peut (dé)activer l'affichage des objectifs ; les chiffres restent
-- toujours visibles, les objectifs ne font que colorer les KPIs (vert/rouge).
-- Table singleton (une seule ligne, id=true).

create table if not exists public.kpi_objectifs (
  id boolean primary key default true,
  actif boolean not null default false,
  objectif_scans integer,            -- scans visés sur la période
  objectif_conversion_pct integer,   -- taux de conversion visé (%)
  objectif_adoption_pct integer,     -- taux d'adoption visé (%)
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint kpi_objectifs_singleton check (id = true)
);

insert into public.kpi_objectifs (id) values (true) on conflict (id) do nothing;

alter table public.kpi_objectifs enable row level security;

-- Lecture réservée admin (le dashboard est admin-only). Écriture via service_role.
create policy "kpi_objectifs_select_admin" on public.kpi_objectifs
  for select using (public.is_admin());
