-- 20260606000002_admin_superpowers.sql
-- Superpouvoir admin : un admin peut LIRE toutes les données de l'équipe
-- (chantiers, intervenants, relances, contacts), pas seulement les siennes.
-- La gestion des profils/agences se fait via le client service_role dans /admin.

-- Helper : l'utilisateur courant est-il admin ?
-- SECURITY DEFINER -> s'exécute avec les droits du propriétaire (postgres,
-- BYPASSRLS) donc la lecture interne de profiles ne déclenche pas de récursion
-- de policy.
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Policies additionnelles "admin peut tout lire" (s'ajoutent en OR aux
-- policies owner existantes : un commercial garde sa vue restreinte).
create policy "chantiers_admin_select" on public.chantiers
  for select using (public.is_admin());

create policy "intervenants_admin_select" on public.chantier_intervenants
  for select using (public.is_admin());

create policy "relances_admin_select" on public.relances
  for select using (public.is_admin());

create policy "contacts_admin_select" on public.contacts_envoyes
  for select using (public.is_admin());
