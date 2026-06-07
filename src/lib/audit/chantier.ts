// src/lib/audit/chantier.ts
// Traçabilité des modifications d'un chantier (#41 étendu aux chantiers).
// Écrit dans chantier_modifications via le client SERVICE ROLE (l'audit doit
// passer la RLS et survivre même si l'utilisateur ne peut pas écrire la ligne).
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// Champs scalaires suivis (diff avant/après). Les intervenants sont gérés à
// part (remplacés en bloc à l'édition) : on les résume via le compteur.
export const CHANTIER_AUDIT_FIELDS = [
  "titre",
  "adresse",
  "ville",
  "code_postal",
  "permis_construire",
  "date_pc",
  "montant_travaux_ht",
  "notes",
] as const;

export type ChantierAuditField = (typeof CHANTIER_AUDIT_FIELDS)[number];

export const CHANTIER_FIELD_LABELS: Record<string, string> = {
  titre: "Titre",
  adresse: "Adresse",
  ville: "Ville",
  code_postal: "Code postal",
  permis_construire: "Permis de construire",
  date_pc: "Date du permis",
  montant_travaux_ht: "Montant travaux HT",
  notes: "Notes",
};

export type Changements = Record<string, { avant: unknown; apres: unknown }>;

/** Diff des champs scalaires suivis entre l'état AVANT et APRÈS. */
export function diffChantier(
  before: Partial<Record<ChantierAuditField, unknown>>,
  after: Partial<Record<ChantierAuditField, unknown>>
): Changements {
  const changements: Changements = {};
  for (const f of CHANTIER_AUDIT_FIELDS) {
    const avant = before[f] ?? null;
    const apres = after[f] ?? null;
    if (avant !== apres) changements[f] = { avant, apres };
  }
  return changements;
}

/** Insère une ligne d'audit. Best-effort : n'interrompt jamais l'opération. */
export async function writeChantierAudit(
  admin: SupabaseClient<Database>,
  opts: {
    chantierId: string | null;
    panneauId: string | null;
    agenceId: string | null;
    modifiePar: string;
    titre: string | null;
    action: "creation" | "modification" | "import" | "suppression";
    changements?: Changements;
  }
): Promise<void> {
  try {
    await admin.from("chantier_modifications").insert({
      chantier_id: opts.chantierId,
      panneau_id: opts.panneauId,
      agence_id: opts.agenceId,
      modifie_par: opts.modifiePar,
      chantier_titre: opts.titre,
      action: opts.action,
      // jsonb : on passe par JSON pour satisfaire le type Json de Supabase.
      changements: JSON.parse(JSON.stringify(opts.changements ?? {})),
    });
  } catch (e) {
    console.error("[audit chantier] insert:", e);
  }
}
