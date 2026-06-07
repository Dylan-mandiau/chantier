// src/lib/suivi/statuts.ts
// Statuts de suivi MANUEL « où j'en suis » d'un intervenant (entreprise) sur un
// chantier. Pipeline détaillé, mais sélection LIBRE (aucun ordre imposé).
// Distinct du statut commercial AUTO (computeStatutCommercial).

export const SUIVI_STATUTS = [
  { value: "a_contacter", label: "À contacter", emoji: "⚪", classes: "bg-gray-100 text-gray-700 border-gray-300" },
  { value: "contacte", label: "Contacté", emoji: "🔵", classes: "bg-blue-100 text-blue-800 border-blue-300" },
  { value: "relance_envoyee", label: "Relance envoyée", emoji: "🟨", classes: "bg-yellow-100 text-yellow-800 border-yellow-300" },
  { value: "rdv_pris", label: "RDV pris", emoji: "📅", classes: "bg-indigo-100 text-indigo-800 border-indigo-300" },
  { value: "devis_envoye", label: "Devis envoyé", emoji: "📄", classes: "bg-amber-100 text-amber-800 border-amber-300" },
  { value: "negociation", label: "Négociation", emoji: "🤝", classes: "bg-orange-100 text-orange-800 border-orange-300" },
  { value: "gagne", label: "Gagné", emoji: "🟢", classes: "bg-green-100 text-green-800 border-green-300 font-semibold" },
  { value: "perdu", label: "Perdu", emoji: "🔴", classes: "bg-red-100 text-red-800 border-red-300" },
] as const;

export type SuiviStatut = (typeof SUIVI_STATUTS)[number]["value"];

export const SUIVI_VALUES = SUIVI_STATUTS.map((s) => s.value) as SuiviStatut[];

const BY_VALUE = new Map(SUIVI_STATUTS.map((s) => [s.value, s] as const));

export function suiviConfig(value: string | null | undefined) {
  return (value && BY_VALUE.get(value as SuiviStatut)) || null;
}

export function suiviLabel(value: string | null | undefined): string {
  return suiviConfig(value)?.label ?? "Non défini";
}
