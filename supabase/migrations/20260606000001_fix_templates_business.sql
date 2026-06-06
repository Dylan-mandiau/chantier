-- 20260606000001_fix_templates_business.sql
-- Corrige les templates seedés : SALTI = loueur de matériels de levage et
-- élévation (nacelles, chariots télescopiques), couverture nationale 47 agences.
-- Les seeds initiaux décrivaient à tort des "matériaux de construction".
-- Calé sur l'email réel d'un commercial SALTI, avec PS code client conditionnel.

UPDATE public.email_templates
SET
  sujet = 'SALTI - Collaboration sur le chantier {{chantier_titre}}',
  corps = E'Bonjour,\n\nNous avons appris votre intervention sur le chantier {{chantier_titre}}.\n\nNous travaillons avec d''autres corps d''état sur cette affaire et serions ravis de collaborer avec vous et répondre à vos besoins à venir en nacelles et chariots.\n\nEn effet, nous sommes loueur de matériels de levage et élévation (couverture nationale de 47 agences), n''hésitez pas à nous faire parvenir vos demandes.\n\nRestant à votre entière disposition et dans l''attente d''un prochain contact.\n\nCordialement,\n{{commercial_nom}}\nSALTI{{code_client_salti_ps}}'
WHERE nom = 'Premier contact — Maîtrise d''œuvre';

UPDATE public.email_templates
SET
  sujet = 'SALTI - Levage & élévation pour {{lot_intitule}} ({{chantier_titre}})',
  corps = E'Bonjour,\n\nNous avons appris votre intervention sur le lot {{lot_numero}} ({{lot_intitule}}) du chantier {{chantier_titre}}.\n\nNous serions ravis de collaborer avec vous et de répondre à vos besoins à venir en nacelles et chariots télescopiques.\n\nNous sommes loueur de matériels de levage et élévation (couverture nationale de 47 agences), n''hésitez pas à nous faire parvenir vos demandes.\n\nRestant à votre entière disposition et dans l''attente d''un prochain contact.\n\nCordialement,\n{{commercial_nom}}\nSALTI{{code_client_salti_ps}}'
WHERE nom = 'Premier contact — Entreprise du lot';

UPDATE public.email_templates
SET
  corps = E'Bonjour,\n\nJe vous recontacte suite à notre dernier échange concernant votre intervention sur {{chantier_titre}}.\n\nAvez-vous des besoins à venir en nacelles ou chariots télescopiques ? Je reste à votre disposition pour étudier vos demandes de location de matériel de levage et d''élévation.\n\nBien cordialement,\n{{commercial_nom}}\nSALTI{{code_client_salti_ps}}'
WHERE nom = 'Relance commerciale';
