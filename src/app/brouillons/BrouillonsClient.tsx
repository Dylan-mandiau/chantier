"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export interface BrouillonItem {
  id: string;
  titre: string;
  ville: string | null;
  code_postal: string | null;
  photoUrl: string | null;
  nbIntervenants: number;
  createdAt: string;
}

export function BrouillonsClient({ items }: { items: BrouillonItem[] }) {
  const router = useRouter();
  // id en cours de traitement -> désactive ses boutons (évite le double-clic).
  const [busy, setBusy] = useState<string | null>(null);

  async function publier(id: string) {
    setBusy(id);
    try {
      const res = await fetch(`/api/chantiers/${id}/publier`, { method: "POST" });
      if (!res.ok) throw new Error();
      toast.success("Brouillon publié sur le tableau de bord");
      router.refresh();
    } catch {
      toast.error("Échec de la publication");
    } finally {
      setBusy(null);
    }
  }

  async function supprimer(id: string) {
    if (!confirm("Supprimer définitivement ce brouillon ?")) return;
    setBusy(id);
    try {
      const res = await fetch(`/api/chantiers/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Brouillon supprimé");
      router.refresh();
    } catch {
      toast.error("Échec de la suppression");
    } finally {
      setBusy(null);
    }
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="mb-2">Aucun brouillon en attente.</p>
        <p className="text-sm">
          Tes prochains scans apparaîtront ici jusqu&apos;à ce que tu les valides.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((c) => {
        const date = new Intl.DateTimeFormat("fr-FR", {
          dateStyle: "short",
        }).format(new Date(c.createdAt));
        return (
          <Card key={c.id} className="overflow-hidden">
            <Link href={`/chantiers/${c.id}`}>
              {c.photoUrl && (
                <div className="aspect-video relative bg-muted">
                  <Image
                    src={c.photoUrl}
                    alt={c.titre}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 400px"
                  />
                  <span className="absolute top-2 left-2 rounded bg-[#FFDD00] px-2 py-0.5 text-xs font-semibold text-black">
                    📝 Brouillon
                  </span>
                </div>
              )}
            </Link>
            <CardContent className="p-3 space-y-2">
              <Link href={`/chantiers/${c.id}`} className="block space-y-1">
                <h3 className="font-semibold line-clamp-2">{c.titre}</h3>
                {(c.code_postal || c.ville) && (
                  <p className="text-sm text-muted-foreground">
                    📍 {c.code_postal} {c.ville}
                  </p>
                )}
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>🏗 {c.nbIntervenants} entreprises</span>
                  <span>{date}</span>
                </div>
              </Link>

              <div className="flex gap-2 pt-1">
                <Button
                  size="sm"
                  className="flex-1"
                  disabled={busy === c.id}
                  onClick={() => publier(c.id)}
                >
                  Valider
                </Button>
                <Link href={`/chantiers/${c.id}/edit`} className="flex-1">
                  <Button size="sm" variant="outline" className="w-full">
                    Modifier
                  </Button>
                </Link>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive"
                  disabled={busy === c.id}
                  onClick={() => supprimer(c.id)}
                  aria-label="Supprimer le brouillon"
                >
                  🗑
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
