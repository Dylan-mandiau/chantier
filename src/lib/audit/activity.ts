// src/lib/audit/activity.ts
// #49 (Lot A) : journal d'activité centralisé. Écrit un événement via le client
// SERVICE ROLE. Best-effort : ne bloque jamais l'opération appelante.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export async function logActivity(
  admin: SupabaseClient<Database>,
  opts: {
    userId: string | null;
    agenceId?: string | null;
    action: string;
    entite?: string | null;
    entiteId?: string | null;
    libelle?: string | null;
  }
): Promise<void> {
  try {
    await admin.from("activity_log").insert({
      user_id: opts.userId,
      agence_id: opts.agenceId ?? null,
      action: opts.action,
      entite: opts.entite ?? null,
      entite_id: opts.entiteId ?? null,
      libelle: opts.libelle ?? null,
    });
  } catch (e) {
    console.error("[activity_log] insert:", e);
  }
}
