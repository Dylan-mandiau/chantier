"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  chantierId: string;
  chantierTitre: string;
}

/**
 * Bouton "Supprimer" avec dialog de confirmation.
 * Sur confirmation : DELETE /api/chantiers/[id] puis redirect vers /.
 */
export function DeleteChantierButton({ chantierId, chantierTitre }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/chantiers/${chantierId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? "Échec de la suppression");
      }
      toast.success("Chantier supprimé");
      setOpen(false);
      router.push("/");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur inconnue");
      setDeleting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        <Button variant="destructive" size="sm">
          <Trash2 className="size-3.5 mr-1" />
          Supprimer
        </Button>
      } />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Supprimer ce chantier ?</DialogTitle>
          <DialogDescription>
            Le chantier &laquo; <strong>{chantierTitre}</strong> &raquo; et tous ses intervenants
            associ&eacute;s seront supprim&eacute;s d&eacute;finitivement. La photo du panneau sera
            aussi effac&eacute;e. Cette action est <strong>irr&eacute;versible</strong>.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={deleting}
          >
            Annuler
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? "Suppression…" : "Oui, supprimer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
