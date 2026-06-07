// src/lib/kpi/compute.ts
// Agrégats du dashboard KPI direction (#51, P1). Calculés côté serveur via le
// client SERVICE ROLE (vue admin globale). 100 % dérivé des tables existantes.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { SUIVI_STATUTS } from "@/lib/suivi/statuts";

export interface KpiData {
  periodeJours: number;
  scans: { total: number; prev: number; deltaPct: number | null };
  contacts: number;
  relances: { aFaire: number; enRetard: number; faites: number };
  entreprises: { total: number; verifiees: number; avecCoords: number; clientsSalti: number };
  pipeline: { value: string; label: string; count: number }[];
  conversion: { gagne: number; totalSuivi: number; tauxPct: number | null };
  scansParJour: { date: string; count: number }[];
  classementCommerciaux: { nom: string; scans: number }[];
  classementAgences: { nom: string; scans: number }[];
}

function isoDaysAgo(now: Date, days: number): string {
  const d = new Date(now);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString();
}

async function countOf(q: PromiseLike<{ count: number | null }>): Promise<number> {
  const { count } = await q;
  return count ?? 0;
}

export async function computeKpis(
  admin: SupabaseClient<Database>,
  periodeJours: number
): Promise<KpiData> {
  const now = new Date();
  const todayIso = now.toISOString().slice(0, 10);
  const sinceIso = isoDaysAgo(now, periodeJours);
  const prevSinceIso = isoDaysAgo(now, periodeJours * 2);

  const head = { count: "exact" as const, head: true };

  const [
    scansPrev,
    contacts,
    relAFaire,
    relEnRetard,
    relFaites,
    entTotal,
    entVerifiees,
    entCoords,
    entSalti,
    suiviRes,
    periodRes,
  ] = await Promise.all([
    countOf(
      admin
        .from("chantiers")
        .select("id", head)
        .gte("created_at", prevSinceIso)
        .lt("created_at", sinceIso)
    ),
    countOf(admin.from("contacts_envoyes").select("id", head).gte("envoye_at", sinceIso)),
    countOf(admin.from("relances").select("id", head).eq("status", "planifiee")),
    countOf(
      admin
        .from("relances")
        .select("id", head)
        .eq("status", "planifiee")
        .lt("date_relance", todayIso)
    ),
    countOf(admin.from("relances").select("id", head).gte("fait_at", sinceIso)),
    countOf(admin.from("entreprises").select("id", head)),
    countOf(admin.from("entreprises").select("id", head).eq("verifie", true)),
    countOf(
      admin
        .from("entreprises")
        .select("id", head)
        .or("telephone.not.is.null,email.not.is.null")
    ),
    countOf(admin.from("entreprises").select("id", head).not("code_client_salti", "is", null)),
    admin.from("intervenant_suivi").select("statut"),
    admin
      .from("chantiers")
      .select("created_by, agence_id, created_at")
      .gte("created_at", sinceIso),
  ]);

  // Pipeline (répartition des suivis par statut).
  const suiviCounts = new Map<string, number>();
  (suiviRes.data ?? []).forEach((s) =>
    suiviCounts.set(s.statut, (suiviCounts.get(s.statut) ?? 0) + 1)
  );
  const totalSuivi = suiviRes.data?.length ?? 0;
  const gagne = suiviCounts.get("gagne") ?? 0;
  const pipeline = SUIVI_STATUTS.map((s) => ({
    value: s.value,
    label: s.label,
    count: suiviCounts.get(s.value) ?? 0,
  }));

  // Scans de la période : par jour + classements.
  const periodRows = periodRes.data ?? [];
  const scansTotal = periodRows.length;

  const parJour = new Map<string, number>();
  for (let i = periodeJours - 1; i >= 0; i--) {
    parJour.set(isoDaysAgo(now, i).slice(0, 10), 0);
  }
  const parCom = new Map<string, number>();
  const parAgence = new Map<string, number>();
  periodRows.forEach((c) => {
    const d = c.created_at.slice(0, 10);
    if (parJour.has(d)) parJour.set(d, (parJour.get(d) ?? 0) + 1);
    if (c.created_by) parCom.set(c.created_by, (parCom.get(c.created_by) ?? 0) + 1);
    if (c.agence_id) parAgence.set(c.agence_id, (parAgence.get(c.agence_id) ?? 0) + 1);
  });

  // Résolution des noms (commerciaux + agences).
  const comIds = [...parCom.keys()];
  const agIds = [...parAgence.keys()];
  const [profilesRes, agencesRes] = await Promise.all([
    comIds.length
      ? admin.from("profiles").select("id, prenom, nom, email").in("id", comIds)
      : Promise.resolve({ data: [] as { id: string; prenom: string | null; nom: string | null; email: string }[] }),
    agIds.length
      ? admin.from("agences").select("id, nom").in("id", agIds)
      : Promise.resolve({ data: [] as { id: string; nom: string }[] }),
  ]);
  const comName = new Map<string, string>();
  (profilesRes.data ?? []).forEach((p) => {
    const n = [p.prenom, p.nom].filter(Boolean).join(" ").trim();
    comName.set(p.id, n || p.email || "Inconnu");
  });
  const agName = new Map<string, string>();
  (agencesRes.data ?? []).forEach((a) => agName.set(a.id, a.nom));

  const classementCommerciaux = [...parCom.entries()]
    .map(([id, scans]) => ({ nom: comName.get(id) ?? "?", scans }))
    .sort((a, b) => b.scans - a.scans)
    .slice(0, 10);
  const classementAgences = [...parAgence.entries()]
    .map(([id, scans]) => ({ nom: agName.get(id) ?? "?", scans }))
    .sort((a, b) => b.scans - a.scans);

  const deltaPct =
    scansPrev > 0 ? Math.round(((scansTotal - scansPrev) / scansPrev) * 100) : null;
  const tauxPct = totalSuivi > 0 ? Math.round((gagne / totalSuivi) * 100) : null;

  return {
    periodeJours,
    scans: { total: scansTotal, prev: scansPrev, deltaPct },
    contacts,
    relances: { aFaire: relAFaire, enRetard: relEnRetard, faites: relFaites },
    entreprises: {
      total: entTotal,
      verifiees: entVerifiees,
      avecCoords: entCoords,
      clientsSalti: entSalti,
    },
    pipeline,
    conversion: { gagne, totalSuivi, tauxPct },
    scansParJour: [...parJour.entries()].map(([date, count]) => ({ date, count })),
    classementCommerciaux,
    classementAgences,
  };
}
