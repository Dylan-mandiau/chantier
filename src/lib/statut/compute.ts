// src/lib/statut/compute.ts

export type StatutCommercial =
  | "inconnu"
  | "premier_contact"
  | "pas_de_reponse"
  | "relance_planifiee"
  | "converti"
  | "refus"
  | "client_salti";

export interface StatutInputs {
  codeClientSalti: string | null;
  dernierContact: {
    statut: "envoye" | "repondu" | "pas_de_reponse" | "refus" | "converti";
    envoye_at: string; // ISO YYYY-MM-DD ou full timestamp
  } | null;
  prochaineRelance: {
    date_relance: string; // ISO YYYY-MM-DD
    motif: string;
  } | null;
  today: string; // ISO YYYY-MM-DD (pour testabilité ; runtime = new Date().toISOString().slice(0,10))
}

/**
 * Détermine le statut commercial d'une entreprise par rapport au commercial courant.
 *
 * Ordre de priorité :
 *   1. client_salti       — si code_client renseigné (toujours top)
 *   2. converti / refus   — état final, prime sur le reste
 *   3. relance_planifiee  — si relance future existe
 *   4. premier_contact    — contact "envoye" récent (≤ 14j)
 *   5. pas_de_reponse     — contact "envoye" ancien (> 14j)
 *   6. inconnu            — défaut
 */
export function computeStatutCommercial(inp: StatutInputs): StatutCommercial {
  if (inp.codeClientSalti && inp.codeClientSalti.length > 0) {
    return "client_salti";
  }

  if (inp.dernierContact?.statut === "converti") return "converti";
  if (inp.dernierContact?.statut === "refus") return "refus";

  if (inp.prochaineRelance && inp.prochaineRelance.date_relance >= inp.today) {
    return "relance_planifiee";
  }

  if (inp.dernierContact?.statut === "envoye") {
    const days = daysBetween(
      inp.dernierContact.envoye_at.slice(0, 10),
      inp.today
    );
    return days <= 14 ? "premier_contact" : "pas_de_reponse";
  }

  return "inconnu";
}

function daysBetween(isoDateA: string, isoDateB: string): number {
  const a = Date.parse(isoDateA + "T00:00:00Z");
  const b = Date.parse(isoDateB + "T00:00:00Z");
  return Math.round((b - a) / 86400000);
}
