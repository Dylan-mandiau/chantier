-- supabase/migrations/20260529000002_rls_policies.sql

alter table public.profiles enable row level security;
alter table public.agences enable row level security;
alter table public.entreprises enable row level security;
alter table public.chantiers enable row level security;
alter table public.chantier_intervenants enable row level security;

-- PROFILES
create policy "profiles_self_select" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_self_update" on public.profiles
  for update using (auth.uid() = id);

-- AGENCES
create policy "agences_authenticated_select" on public.agences
  for select using (auth.role() = 'authenticated');

-- ENTREPRISES : lecture pour tous, écriture serveur (service_role)
create policy "entreprises_authenticated_select" on public.entreprises
  for select using (auth.role() = 'authenticated');

-- CHANTIERS : owner only (MVP)
create policy "chantiers_owner_select" on public.chantiers
  for select using (auth.uid() = created_by);
create policy "chantiers_owner_insert" on public.chantiers
  for insert with check (auth.uid() = created_by);
create policy "chantiers_owner_update" on public.chantiers
  for update using (auth.uid() = created_by);
create policy "chantiers_owner_delete" on public.chantiers
  for delete using (auth.uid() = created_by);

-- CHANTIER_INTERVENANTS : visible si chantier visible
create policy "intervenants_via_chantier_select" on public.chantier_intervenants
  for select using (
    exists (
      select 1 from public.chantiers
      where chantiers.id = chantier_intervenants.chantier_id
        and chantiers.created_by = auth.uid()
    )
  );

create policy "intervenants_via_chantier_insert" on public.chantier_intervenants
  for insert with check (
    exists (
      select 1 from public.chantiers
      where chantiers.id = chantier_intervenants.chantier_id
        and chantiers.created_by = auth.uid()
    )
  );

create policy "intervenants_via_chantier_delete" on public.chantier_intervenants
  for delete using (
    exists (
      select 1 from public.chantiers
      where chantiers.id = chantier_intervenants.chantier_id
        and chantiers.created_by = auth.uid()
    )
  );
