"use client";

import { useEffect, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Mail } from "lucide-react";
import { toast } from "sonner";
import { renderTemplate, type TemplateVars } from "@/lib/templates/render";

interface Template {
  id: string;
  nom: string;
  sujet: string;
  corps: string;
  type: "premier_contact" | "relance" | "rdv";
}

interface Props {
  entreprise: {
    id: string;
    raison_sociale: string;
    email: string | null;
    code_client_salti: string | null;
  };
  commercialNom: string;
  intervenantContext?: {
    intervenant_id?: string;
    chantier_titre?: string;
    lot_numero?: string | null;
    lot_intitule?: string | null;
  };
}

export function PremierContactButton({
  entreprise,
  commercialNom,
  intervenantContext,
}: Props) {
  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [codeClient, setCodeClient] = useState(entreprise.code_client_salti ?? "");
  const [sujet, setSujet] = useState("");
  const [corps, setCorps] = useState("");

  useEffect(() => {
    if (!open) return;
    fetch("/api/templates")
      .then((r) => r.json())
      .then((data) => {
        const list: Template[] = (data.templates ?? []).filter(
          (t: Template) => t.type === "premier_contact"
        );
        setTemplates(list);
        if (list.length > 0) setSelectedId(list[0].id);
      })
      .catch(() => toast.error("Impossible de charger les templates"));
  }, [open]);

  useEffect(() => {
    if (!selectedId) return;
    const tpl = templates.find((t) => t.id === selectedId);
    if (!tpl) return;
    const vars: TemplateVars = {
      raison_sociale: entreprise.raison_sociale,
      commercial_nom: commercialNom,
      code_client_salti: codeClient.trim() || null,
      chantier_titre: intervenantContext?.chantier_titre ?? "",
      lot_numero: intervenantContext?.lot_numero ?? null,
      lot_intitule: intervenantContext?.lot_intitule ?? null,
    };
    setSujet(renderTemplate(tpl.sujet, vars));
    setCorps(renderTemplate(tpl.corps, vars));
  }, [selectedId, codeClient, templates, entreprise, commercialNom, intervenantContext]);

  async function handleSend() {
    if (!entreprise.email) {
      toast.error("Cette entreprise n'a pas d'email — ajoute-le d'abord");
      return;
    }
    const mailto = `mailto:${encodeURIComponent(entreprise.email)}?subject=${encodeURIComponent(sujet)}&body=${encodeURIComponent(corps)}`;
    window.location.href = mailto;

    try {
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entreprise_id: entreprise.id,
          intervenant_id: intervenantContext?.intervenant_id ?? null,
          template_id: selectedId || null,
          sujet,
          corps,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Contact enregistré");
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Échec enregistrement contact");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        <Button variant="default" size="sm" disabled={!entreprise.email}>
          <Mail className="size-3.5 mr-1" />
          Premier contact
        </Button>
      } />
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Envoyer un premier contact à {entreprise.raison_sociale}</DialogTitle>
          <DialogDescription>
            Le mail s&apos;ouvrira dans ton client mail (Outlook/Gmail). Tu pourras éditer avant d&apos;envoyer.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Template</Label>
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="w-full bg-background border rounded px-3 py-2 text-sm"
            >
              {templates.length === 0 && <option value="">Chargement...</option>}
              {templates.map((t) => (
                <option key={t.id} value={t.id}>{t.nom}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label>Code client SALTI (optionnel)</Label>
            <Input
              value={codeClient}
              onChange={(e) => setCodeClient(e.target.value)}
              placeholder="ex: AB-12345 (vide si tu ne sais pas)"
            />
            <p className="text-xs text-muted-foreground">
              Si rempli, le mail mentionnera ce code client.
            </p>
          </div>
          <div className="space-y-1">
            <Label>Sujet (modifiable)</Label>
            <Input value={sujet} onChange={(e) => setSujet(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Corps (modifiable)</Label>
            <Textarea value={corps} onChange={(e) => setCorps(e.target.value)} rows={12} />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
          <Button onClick={handleSend}>
            <Mail className="size-3.5 mr-1" />
            Envoyer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
