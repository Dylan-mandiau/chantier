import { z } from "zod";

export const IntervenantRoleSchema = z.enum([
  "maitrise_ouvrage",
  "maitrise_ouvrage_mandataire",
  "architecte",
  "maitre_oeuvre",
  "economiste",
  "be_structure",
  "be_fluides",
  "be_electricite",
  "be_vrd",
  "be_acoustique",
  "controle",
  "sps",
  "opc",
  "lot",
]);

export const AnalyzedProjetSchema = z.object({
  titre: z.string().min(1),
  adresse: z.string().nullable(),
  ville: z.string().nullable(),
  code_postal: z.string().nullable(),
  permis_construire: z.string().nullable(),
  date_pc: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  montant_travaux_ht: z.number().nullable(),
});

export const AnalyzedIntervenantSchema = z.object({
  role: IntervenantRoleSchema,
  raison_sociale: z.string().min(1),
  lot_numero: z.string().nullable(),
  lot_intitule: z.string().nullable(),
  rang: z.union([z.literal(1), z.literal(2)]),
  adresse: z.string().nullable(),
  ville: z.string().nullable(),
  code_postal: z.string().nullable(),
  telephone: z.string().nullable(),
  email: z.string().nullable(),
  confiance_lecture: z.number().min(0).max(1),
});

export const AnalyzedPanneauSchema = z.object({
  projet: AnalyzedProjetSchema,
  intervenants: z.array(AnalyzedIntervenantSchema),
});

export type AnalyzedPanneau = z.infer<typeof AnalyzedPanneauSchema>;
export type AnalyzedIntervenant = z.infer<typeof AnalyzedIntervenantSchema>;
