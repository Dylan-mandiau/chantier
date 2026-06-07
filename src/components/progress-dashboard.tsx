import Link from "next/link";

/**
 * Dashboard de progression personnel affiché en tête de l'accueil (#47).
 * Présentationnel : reçoit des compteurs déjà calculés côté serveur.
 * Objectif : rendre l'appli plus motivante (objectif hebdo + tuiles ludiques).
 */
export interface ProgressStats {
  prenom: string | null;
  scansTotal: number;
  scansWeek: number;
  contactsTotal: number;
  contactsWeek: number;
  relancesAFaire: number;
  relancesEnRetard: number;
  /** Objectif hebdomadaire de scans (défaut 5) */
  weeklyGoal?: number;
}

function StatTile({
  emoji,
  value,
  label,
  sub,
  highlight = false,
}: {
  emoji: string;
  value: number;
  label: string;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-3 text-center ${
        highlight ? "border-amber-300 bg-amber-50" : "bg-card"
      }`}
    >
      <div className="text-2xl leading-none">{emoji}</div>
      <div className="text-2xl font-bold leading-tight mt-1">{value}</div>
      <div className="text-[11px] text-muted-foreground leading-tight">
        {label}
      </div>
      {sub && (
        <div className="text-[10px] text-muted-foreground/70 mt-0.5">{sub}</div>
      )}
    </div>
  );
}

export function ProgressDashboard({
  prenom,
  scansTotal,
  scansWeek,
  contactsTotal,
  contactsWeek,
  relancesAFaire,
  relancesEnRetard,
  weeklyGoal = 5,
}: ProgressStats) {
  const pct = Math.min(100, Math.round((scansWeek / weeklyGoal) * 100));
  const goalReached = scansWeek >= weeklyGoal;
  const reste = Math.max(0, weeklyGoal - scansWeek);

  const message = goalReached
    ? "Objectif atteint ! 🎉"
    : scansWeek === 0
      ? "C'est parti ! 🚀"
      : `Encore ${reste} pour l'objectif 💪`;

  return (
    <section className="space-y-3">
      {/* Accueil + objectif hebdo */}
      <div className="rounded-2xl border bg-gradient-to-br from-primary/20 to-primary/5 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground">Ta semaine</p>
            <h2 className="text-xl font-bold">
              {prenom ? `Salut ${prenom} 👋` : "Bienvenue 👋"}
            </h2>
          </div>
          {goalReached && (
            <span className="text-3xl" aria-hidden>
              🏆
            </span>
          )}
        </div>

        <div className="mt-3">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-medium">
              Objectif de la semaine · {scansWeek}/{weeklyGoal} scans
            </span>
            <span className="text-muted-foreground">{message}</span>
          </div>
          <div className="h-2.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Tuiles compteurs */}
      <div className="grid grid-cols-3 gap-2">
        <StatTile
          emoji="📸"
          value={scansWeek}
          label="scans cette semaine"
          sub={`${scansTotal} au total`}
        />
        <Link href="/relances" className="block">
          <StatTile
            emoji="📞"
            value={relancesAFaire}
            label="relances à faire"
            sub={relancesEnRetard > 0 ? `${relancesEnRetard} en retard` : "à jour ✓"}
            highlight={relancesEnRetard > 0}
          />
        </Link>
        <StatTile
          emoji="👤"
          value={contactsWeek}
          label="contacts ajoutés"
          sub={`${contactsTotal} au total`}
        />
      </div>
    </section>
  );
}
