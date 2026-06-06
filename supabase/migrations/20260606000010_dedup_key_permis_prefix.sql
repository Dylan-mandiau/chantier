-- 20260606000010_dedup_key_permis_prefix.sql
-- Corrige la clé de dédup des chantiers existants : retire le PRÉFIXE de
-- lettres du permis de construire ("PC N° 72181 24 Z0078" doit donner la même
-- clé que "72181 24 Z0078"). Aligné avec la fonction JS chantierDedupKey.

-- 1. Recompute les clés "pc:" (cœur alphanumérique sans préfixe de lettres).
update public.chantiers
set dedup_key = 'pc:' || regexp_replace(
      lower(regexp_replace(permis_construire, '[^a-zA-Z0-9]', '', 'g')),
      '^[a-z]+', ''
    )
where dedup_key like 'pc:%'
  and permis_construire is not null
  and length(
        regexp_replace(
          lower(regexp_replace(permis_construire, '[^a-zA-Z0-9]', '', 'g')),
          '^[a-z]+', ''
        )
      ) >= 3;

-- 2. Reconstruit les panneaux (dérivés du dedup_key) et relie les chantiers.
--    La FK ON DELETE SET NULL remet chantiers.panneau_id à NULL automatiquement.
delete from public.panneaux;

insert into public.panneaux (dedup_key, titre)
select distinct on (dedup_key) dedup_key, titre
from public.chantiers
where dedup_key is not null
on conflict (dedup_key) do nothing;

update public.chantiers c
set panneau_id = p.id
from public.panneaux p
where p.dedup_key = c.dedup_key;
