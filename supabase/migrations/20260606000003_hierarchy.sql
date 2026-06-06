-- 20260606000003_hierarchy.sql
-- Hiérarchie de visibilité : chaque utilisateur a un manager (manager_id).
--   commercial.manager_id      -> son responsable commercial (RC)
--   rc.manager_id              -> son chef de secteur
--   chef_secteur.manager_id    -> null (ou admin)
-- Un manager voit les données de tout son sous-arbre (récursif).

alter table public.profiles
  add column if not exists manager_id uuid references public.profiles(id) on delete set null;

create index if not exists profiles_manager_idx on public.profiles (manager_id);

-- L'utilisateur courant peut-il voir les données créées par `target` ?
-- Vrai si admin, si target == soi, ou si target est dans le sous-arbre managé.
-- SECURITY DEFINER -> la lecture récursive de profiles ne déclenche pas la RLS.
create or replace function public.can_view_profile(target uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  with recursive sub as (
    select id from public.profiles where id = auth.uid()
    union all
    select p.id
    from public.profiles p
    join sub on p.manager_id = sub.id
  )
  select public.is_admin() or exists (select 1 from sub where id = target);
$$;

-- Policies hiérarchiques (s'ajoutent en OR aux policies owner/admin existantes).
create policy "chantiers_hier_select" on public.chantiers
  for select using (public.can_view_profile(created_by));

create policy "relances_hier_select" on public.relances
  for select using (public.can_view_profile(created_by));

create policy "contacts_hier_select" on public.contacts_envoyes
  for select using (public.can_view_profile(envoye_par));

create policy "intervenants_hier_select" on public.chantier_intervenants
  for select using (
    exists (
      select 1 from public.chantiers c
      where c.id = chantier_intervenants.chantier_id
        and public.can_view_profile(c.created_by)
    )
  );
