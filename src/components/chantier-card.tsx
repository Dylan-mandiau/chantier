import Link from "next/link";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";

interface Props {
  id: string;
  titre: string;
  ville: string | null;
  codePostal: string | null;
  photoUrl: string | null;
  nbIntervenants: number;
  createdAt: string;
  author?: string | null;
}

export function ChantierCard({
  id,
  titre,
  ville,
  codePostal,
  photoUrl,
  nbIntervenants,
  createdAt,
  author,
}: Props) {
  const date = new Intl.DateTimeFormat("fr-FR", { dateStyle: "short" }).format(new Date(createdAt));

  return (
    <Link href={`/chantiers/${id}`}>
      <Card className="hover:shadow-md transition-shadow overflow-hidden">
        {photoUrl && (
          <div className="aspect-video relative bg-muted">
            <Image
              src={photoUrl}
              alt={titre}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 400px"
            />
          </div>
        )}
        <CardContent className="p-3 space-y-1">
          <h3 className="font-semibold line-clamp-2">{titre}</h3>
          {(codePostal || ville) && (
            <p className="text-sm text-muted-foreground">📍 {codePostal} {ville}</p>
          )}
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>🏗 {nbIntervenants} entreprises</span>
            <span>{date}</span>
          </div>
          {author && (
            <p className="text-xs text-muted-foreground">👤 par {author}</p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
