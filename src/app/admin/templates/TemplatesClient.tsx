"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Save } from "lucide-react";
import { toast } from "sonner";

export interface Template {
  id: string;
  nom: string;
  sujet: string;
  corps: string;
  type: "premier_contact" | "relance" | "rdv";
}

export function TemplatesClient({
  initialTemplates,
}: {
  initialTemplates: Template[];
}) {
  const router = useRouter();
  const [templates, setTemplates] = useState(initialTemplates);
  const [editing, setEditing] = useState<Template | null>(null);
  const [saving, setSaving] = useState(false);

  function startNew() {
    setEditing({
      id: "",
      nom: "",
      sujet: "",
      corps: "",
      type: "premier_contact",
    });
  }

  async function save() {
    if (!editing) return;
    if (!editing.nom.trim() || !editing.sujet.trim() || !editing.corps.trim()) {
      toast.error("Tous les champs sont obligatoires");
      return;
    }
    setSaving(true);
    try {
      const url = editing.id ? `/api/templates/${editing.id}` : "/api/templates";
      const method = editing.id ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nom: editing.nom,
          sujet: editing.sujet,
          corps: editing.corps,
          type: editing.type,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Template enregistré");
      setEditing(null);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  async function deleteOne(id: string) {
    if (
      !confirm(
        "Désactiver ce template ? (les contacts déjà envoyés gardent leur référence)"
      )
    )
      return;
    const res = await fetch(`/api/templates/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error((await res.json()).error);
      return;
    }
    setTemplates(templates.filter((t) => t.id !== id));
    toast.success("Template désactivé");
  }

  return (
    <main className="container max-w-3xl mx-auto p-4 space-y-4 pb-20">
      <div className="flex items-center justify-between">
        <Link href="/">
          <Button variant="ghost" size="sm">← Retour</Button>
        </Link>
        <h1 className="text-lg font-semibold">Admin — Templates email</h1>
        <Button onClick={startNew} disabled={!!editing}>
          <Plus className="size-3.5 mr-1" /> Nouveau
        </Button>
      </div>

      {editing && (
        <Card className="border-2 border-primary">
          <CardHeader>
            <CardTitle>
              {editing.id ? "Modifier" : "Nouveau"} template
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label>Nom (interne)</Label>
              <Input
                value={editing.nom}
                onChange={(e) => setEditing({ ...editing, nom: e.target.value })}
                placeholder="ex: Premier contact — MOE"
              />
            </div>
            <div className="space-y-1">
              <Label>Type</Label>
              <select
                value={editing.type}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    type: e.target.value as Template["type"],
                  })
                }
                className="w-full bg-background border rounded px-3 py-2 text-sm"
              >
                <option value="premier_contact">Premier contact</option>
                <option value="relance">Relance</option>
                <option value="rdv">Demande de RDV</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label>Sujet</Label>
              <Input
                value={editing.sujet}
                onChange={(e) => setEditing({ ...editing, sujet: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>
                Corps (vars :{" "}
                {`{{raison_sociale}} {{commercial_nom}} {{code_client_salti}} {{code_client_salti_phrase}} {{chantier_titre}} {{lot_numero}} {{lot_intitule}}`}
                )
              </Label>
              <Textarea
                value={editing.corps}
                onChange={(e) =>
                  setEditing({ ...editing, corps: e.target.value })
                }
                rows={12}
                className="font-mono text-xs"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEditing(null)}>
                Annuler
              </Button>
              <Button onClick={save} disabled={saving}>
                <Save className="size-3.5 mr-1" />{" "}
                {saving ? "..." : "Enregistrer"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {templates.map((t) => (
        <Card key={t.id}>
          <CardContent className="p-3 flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <p className="font-semibold">{t.nom}</p>
                <Badge variant="secondary">{t.type}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{t.sujet}</p>
            </div>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" onClick={() => setEditing(t)}>
                Modifier
              </Button>
              <Button variant="ghost" size="sm" onClick={() => deleteOne(t.id)}>
                <Trash2 className="size-3 text-destructive" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </main>
  );
}
