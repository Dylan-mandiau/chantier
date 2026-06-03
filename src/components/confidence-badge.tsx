import { Badge } from "@/components/ui/badge";
import type { ConfidenceSource } from "@/types/domain";

interface Props {
  source?: ConfidenceSource;
  confidence?: number;
}

const SOURCE_LABELS: Record<ConfidenceSource, string> = {
  panneau: "panneau",
  sirene: "sirene",
  tavily: "web",
  manuel: "saisi",
};

export function ConfidenceBadge({ source, confidence }: Props) {
  if (!source) {
    return (
      <Badge variant="destructive" className="text-xs">
        manquant
      </Badge>
    );
  }

  const colorClass =
    source === "panneau"
      ? "bg-green-100 text-green-800 border-green-300"
      : source === "sirene"
      ? "bg-yellow-100 text-yellow-800 border-yellow-300"
      : "bg-orange-100 text-orange-800 border-orange-300";

  const pct =
    confidence !== undefined ? ` ${Math.round(confidence * 100)}%` : "";

  return (
    <Badge variant="outline" className={`text-xs ${colorClass}`}>
      {SOURCE_LABELS[source]}
      {pct}
    </Badge>
  );
}
