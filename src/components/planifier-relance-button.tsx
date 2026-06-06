"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Bell } from "lucide-react";
import { toast } from "sonner";

interface Props {
  entrepriseId: string;
  entrepriseNom: string;
  chantierId?: string;
}

export function PlanifierRelanceButton({
  entrepriseId,
  entrepriseNom,
  chantierId,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(defaultDate());
  const [motif, setMotif] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSave() {
    if (!motif.trim()) {
      toast.error("Indique un motif");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/relances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entreprise_id: entrepriseId,
          date_relance: date,
          motif: motif.trim(),
          chantier_id: chantierId ?? null,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Relance planifiée");
      setOpen(false);
      setMotif("");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        <Button variant="outline" size="sm">
          <Bell className="size-3.5 mr-1" />
          Planifier relance
        </Button>
      } />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Planifier une relance pour {entrepriseNom}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Date de relance</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Motif</Label>
            <Textarea
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              placeholder="ex: Confirmer rdv jeudi, envoyer brochure, demander devis..."
              rows={4}
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
          <Button onClick={handleSave} disabled={submitting}>
            {submitting ? "..." : "Planifier"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function defaultDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0, 10);
}
