"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { AnalyzedPanneau, AnalyzedIntervenant } from "@/lib/ai/schema";

interface Props {
  chantierId: string;
  photoUrl: string | null;
  initialData: AnalyzedPanneau;
  initialNotes: string;
}

const ROLES: AnalyzedIntervenant["role"][] = [
  "maitrise_ouvrage",
  "maitrise_ouvrage_mandataire",
  "architecte",
  "maitre_oeuvre",
  "economiste",
  "be_structure",
  "be_fluides",
  "be_electricite",
  "be_vrd",
  "be_acoustique",
  "controle",
  "sps",
  "opc",
  "lot",
];

function emptyIntervenant(): AnalyzedIntervenant {
  return {
    role: "lot",
    raison_sociale: "",
    lot_numero: null,
    lot_intitule: null,
    rang: 1,
    adresse: null,
    ville: null,
    code_postal: null,
    telephone: null,
    email: null,
    confiance_lecture: 1.0,
  };
}

export function EditClient({
  chantierId,
  photoUrl,
  initialData,
  initialNotes,
}: Props) {
  const router = useRouter();
  const [data, setData] = useState<AnalyzedPanneau>(initialData);
  const [notes, setNotes] = useState(initialNotes);
  const [saving, setSaving] = useState(false);

  function updateProjet<K extends keyof AnalyzedPanneau["projet"]>(
    key: K,
    value: AnalyzedPanneau["projet"][K]
  ) {
    setData({ ...data, projet: { ...data.projet, [key]: value } });
  }

  function updateIntervenant(
    idx: number,
    patch: Partial<AnalyzedIntervenant>
  ) {
    const next = [...data.intervenants];
    next[idx] = { ...next[idx], ...patch };
    setData({ ...data, intervenants: next });
  }

  function removeIntervenant(idx: number) {
    setData({
      ...data,
      intervenants: data.intervenants.filter((_, i) => i !== idx),
    });
  }

  function addIntervenant() {
    setData({
      ...data,
      intervenants: [...data.intervenants, emptyIntervenant()],
    });
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/chantiers/${chantierId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notes: notes.trim() || null,
          analyzed: data,
        }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? "Échec de la sauvegarde");
      }
      toast.success("Chantier modifié");
      router.push(`/chantiers/${chantierId}`);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur inconnue");
      setSaving(false);
    }
  }

  return (
    <main className="container max-w-2xl mx-auto p-4 space-y-4 pb-32">
      <div className="flex items-center justify-between">
        <Link href={`/chantiers/${chantierId}`}>
          <Button variant="ghost" size="sm">← Annuler</Button>
        </Link>
        <h1 className="text-lg font-semibold">Modifier le chantier</h1>
        <div className="w-20" />
      </div>

      {photoUrl && (
        <Card>
          <CardContent className="p-4">
            <Image
              src={photoUrl}
              alt="Panneau"
              width={800}
              height={600}
              className="rounded-md w-full h-auto"
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Projet</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label>Titre</Label>
            <Input
              value={data.projet.titre}
              onChange={(e) => updateProjet("titre", e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Ville</Label>
              <Input
                value={data.projet.ville ?? ""}
                onChange={(e) => updateProjet("ville", e.target.value || null)}
              />
            </div>
            <div className="space-y-1">
              <Label>Code postal</Label>
              <Input
                value={data.projet.code_postal ?? ""}
                onChange={(e) => updateProjet("code_postal", e.target.value || null)}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Adresse</Label>
            <Input
              value={data.projet.adresse ?? ""}
              onChange={(e) => updateProjet("adresse", e.target.value || null)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Permis de construire</Label>
              <Input
                value={data.projet.permis_construire ?? ""}
                onChange={(e) => updateProjet("permis_construire", e.target.value || null)}
              />
            </div>
            <div className="space-y-1">
              <Label>Montant HT (€)</Label>
              <Input
                type="number"
                value={data.projet.montant_travaux_ht ?? ""}
                onChange={(e) =>
                  updateProjet("montant_travaux_ht", e.target.value ? Number(e.target.value) : null)
                }
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Date du permis</Label>
            <Input
              type="date"
              value={data.projet.date_pc ?? ""}
              onChange={(e) => updateProjet("date_pc", e.target.value || null)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Intervenants ({data.intervenants.length})</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addIntervenant}>
              <Plus className="size-3.5 mr-1" /> Ajouter
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.intervenants.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Aucun intervenant. Clique sur &laquo; Ajouter &raquo; pour en cr&eacute;er un.
            </p>
          )}
          {data.intervenants.map((it, idx) => (
            <div key={idx} className="border rounded-md p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <select
                  value={it.role}
                  onChange={(e) => updateIntervenant(idx, { role: e.target.value as AnalyzedIntervenant["role"] })}
                  className="text-xs bg-background border rounded px-2 py-1 flex-1"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>{r.replace(/_/g, " ")}</option>
                  ))}
                </select>
                <Badge variant="outline" className="text-xs">
                  Rang {it.rang}
                </Badge>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeIntervenant(idx)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
              <Input
                value={it.raison_sociale}
                onChange={(e) => updateIntervenant(idx, { raison_sociale: e.target.value })}
                placeholder="Raison sociale *"
              />
              {it.role === "lot" && (
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    value={it.lot_numero ?? ""}
                    onChange={(e) => updateIntervenant(idx, { lot_numero: e.target.value || null })}
                    placeholder="N° lot"
                  />
                  <Input
                    value={it.lot_intitule ?? ""}
                    onChange={(e) => updateIntervenant(idx, { lot_intitule: e.target.value || null })}
                    placeholder="Intitulé lot"
                  />
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <Input
                  value={it.telephone ?? ""}
                  onChange={(e) => updateIntervenant(idx, { telephone: e.target.value || null })}
                  placeholder="Téléphone"
                />
                <Input
                  value={it.email ?? ""}
                  onChange={(e) => updateIntervenant(idx, { email: e.target.value || null })}
                  placeholder="Email"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  value={it.code_postal ?? ""}
                  onChange={(e) => updateIntervenant(idx, { code_postal: e.target.value || null })}
                  placeholder="Code postal"
                />
                <Input
                  value={it.ville ?? ""}
                  onChange={(e) => updateIntervenant(idx, { ville: e.target.value || null })}
                  placeholder="Ville"
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
        <CardContent>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Tes notes sur ce chantier…"
            rows={4}
          />
        </CardContent>
      </Card>

      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t p-3">
        <div className="container max-w-2xl mx-auto flex gap-2">
          <Link href={`/chantiers/${chantierId}`} className="flex-1">
            <Button variant="outline" className="w-full h-12 text-lg" type="button">
              Annuler
            </Button>
          </Link>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 h-12 text-lg"
          >
            {saving ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </div>
      </div>
    </main>
  );
}
