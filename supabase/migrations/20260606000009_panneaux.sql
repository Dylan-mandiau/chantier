-- 20260606000009_panneaux.sql
-- Phase 2 — Lien durable entre les fiches d'un même panneau (multi-agences).
-- Un "panneau" regroupe tous les chantiers (1 par agence) qui correspondent
-- au même panneau de chantier (même dedup_key). Permet : l'import inter-agence
-- (lier la fiche importée à la source) + le regroupement admin
-- ("ce chantier intéresse N agences").

create table if not exists public.panneaux (
  id uuid primary key default gen_random_uuid(),
  dedup_key text unique not null,
  titre text,
  created_at timestamptz not null default now()
);

alter table public.chantiers
  add column if not exists panneau_id uuid references public.panneaux(id) on delete set null;

create index if not exists chantiers_panneau_idx on public.chantiers (panneau_id);

-- RLS : lecture pour tout utilisateur authentifié ; écriture via service_role
-- uniquement (l'app crée/lie les panneaux côté serveur avec le service role).
alter table public.panneaux enable row level security;
create policy "panneaux_auth_select" on public.panneaux
  for select using (auth.role() = 'authenticated');

-- Backfill : crée un panneau par dedup_key existant, puis lie les chantiers.
insert into public.panneaux (dedup_key, titre)
select distinct on (dedup_key) dedup_key, titre
from public.chantiers
where dedup_key is not null
on conflict (dedup_key) do nothing;

update public.chantiers c
set panneau_id = p.id
from public.panneaux p
where p.dedup_key = c.dedup_key
  and c.panneau_id is null;
