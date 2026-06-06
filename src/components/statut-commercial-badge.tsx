import { Badge } from "@/components/ui/badge";
import type { StatutCommercial } from "@/lib/statut/compute";

interface Props {
  statut: StatutCommercial;
  className?: string;
}

const CONFIG: Record<
  StatutCommercial,
  { label: string; emoji: string; classes: string }
> = {
  inconnu: {
    label: "Inconnu",
    emoji: "⚪",
    classes: "bg-gray-100 text-gray-700 border-gray-300",
  },
  premier_contact: {
    label: "Premier contact",
    emoji: "🟦",
    classes: "bg-blue-100 text-blue-800 border-blue-300",
  },
  pas_de_reponse: {
    label: "Sans réponse",
    emoji: "⏳",
    classes: "bg-amber-100 text-amber-800 border-amber-300",
  },
  relance_planifiee: {
    label: "Relance prévue",
    emoji: "🟨",
    classes: "bg-yellow-100 text-yellow-800 border-yellow-300",
  },
  converti: {
    label: "Converti",
    emoji: "🟩",
    classes: "bg-green-100 text-green-800 border-green-300",
  },
  refus: {
    label: "Refus",
    emoji: "🟥",
    classes: "bg-red-100 text-red-800 border-red-300",
  },
  client_salti: {
    label: "Client SALTI",
    emoji: "⭐",
    classes: "bg-purple-100 text-purple-800 border-purple-300 font-semibold",
  },
};

export function StatutCommercialBadge({ statut, className = "" }: Props) {
  const cfg = CONFIG[statut];
  return (
    <Badge variant="outline" className={`text-xs ${cfg.classes} ${className}`}>
      <span className="mr-1">{cfg.emoji}</span>
      {cfg.label}
    </Badge>
  );
}
