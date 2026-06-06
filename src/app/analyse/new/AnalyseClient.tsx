"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ConfidenceBadge } from "@/components/confidence-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import type { AnalyzedPanneau } from "@/lib/ai/schema";

interface Props {
  photoPath: string;
  photoUrl: string;
  lat: number | null;
  lng: number | null;
}

// Info renvoyée par l'API quand un chantier au même permis existe déjà.
interface DuplicateInfo {
  id: string;
  titre: string;
  owner_name: string;
  created_at: string;
  can_open: boolean;
  same_agence: boolean;
}

export function AnalyseClient({ photoPath, photoUrl, lat, lng }: Props) {
  const router = useRouter();
  const [analyzing, setAnalyzing] = useState(true);
  const [data, setData] = useState<AnalyzedPanneau | null>(null);
  // Valeurs telles que lues par l'IA, conservées pour distinguer
  // "panneau" (inchangé) de "saisi" (modifié/ajouté à la main).
  const [iaValues, setIaValues] = useState<
    { telephone: string | null; email: string | null }[]
  >([]);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Doublon détecté (même permis de construire) -> ouvre la boîte de dialogue.
  const [duplicate, setDuplicate] = useState<DuplicateInfo | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ photo_path: photoPath }),
        });
        if (!res.ok) {
          const body = await res.json();
          throw new Error(body.error ?? "Échec de l'analyse");
        }
        const payload = await res.json();
        if (!cancelled) {
          const parsed: AnalyzedPanneau = payload.parsed;
          setData(parsed);
          setIaValues(
            parsed.intervenants.map((it) => ({
              telephone: it.telephone,
              email: it.email,
            }))
          );
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Erreur inconnue");
      } finally {
        if (!cancelled) setAnalyzing(false);
      }
    })();
    return () => { cancelled = true; };
  }, [photoPath]);

  // Détermine la source d'un champ contact pour le badge de confiance :
  //  - valeur vide -> undefined (badge "manquant")
  //  - identique à ce que l'IA a lu -> "panneau"
  //  - différente / ajoutée à la main -> "manuel" (affiché "saisi")
  function fieldSource(
    idx: number,
    field: "telephone" | "email",
    value: string | null
  ): "panneau" | "manuel" | undefined {
    if (!value) return undefined;
    const original = iaValues[idx]?.[field] ?? null;
    return original && original === value ? "panneau" : "manuel";
  }

  function updateProjet<K extends keyof AnalyzedPanneau["projet"]>(
    key: K,
    value: AnalyzedPanneau["projet"][K]
  ) {
    if (!data) return;
    setData({ ...data, projet: { ...data.projet, [key]: value } });
  }

  function updateIntervenant(
    idx: number,
    patch: Partial<AnalyzedPanneau["intervenants"][number]>
  ) {
    if (!data) return;
    const next = [...data.intervenants];
    next[idx] = { ...next[idx], ...patch };
    setData({ ...data, intervenants: next });
  }

  function removeIntervenant(idx: number) {
    if (!data) return;
    setData({
      ...data,
      intervenants: data.intervenants.filter((_, i) => i !== idx),
    });
  }

  // force=true : créer quand même malgré le doublon détecté.
  async function handleSave(force = false) {
    if (!data) return;
    setSaving(true);
    try {
      const res = await fetch("/api/chantiers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          photo_path: photoPath,
          lat,
          lng,
          notes: notes.trim() || null,
          analyzed: data,
          force,
        }),
      });

      // 409 + duplicate -> on montre la boîte "déjà scanné" au lieu d'enregistrer.
      if (res.status === 409) {
        const body = await res.json();
        if (body.duplicate) {
          setDuplicate(body.duplicate as DuplicateInfo);
          setSaving(false);
          return;
        }
      }

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? "Échec de la sauvegarde");
      }
      const { chantier_id } = await res.json();
      toast.success("Chantier enregistré");
      router.push(`/chantiers/${chantier_id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur inconnue");
      setSaving(false);
    }
  }

  if (analyzing) {
    return (
      <main className="container max-w-2xl mx-auto p-4 space-y-4">
        <Card>
          <CardContent className="p-6 space-y-4">
            <Image
              src={photoUrl}
              alt="Panneau"
              width={800}
              height={600}
              className="rounded-md w-full h-auto"
            />
            <p className="text-lg font-medium text-center animate-pulse">
              Analyse en cours…
            </p>
            <Skeleton className="h-6 w-3/4 mx-auto" />
            <Skeleton className="h-6 w-1/2 mx-auto" />
          </CardContent>
        </Card>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="container max-w-2xl mx-auto p-4">
        <Card>
          <CardContent className="p-6 space-y-4">
            <p className="text-destructive">{error ?? "Aucune donnée"}</p>
            <Button onClick={() => router.push("/nouveau")}>Retour</Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="container max-w-2xl mx-auto p-4 space-y-4 pb-32">
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Intervenants ({data.intervenants.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.intervenants.map((it, idx) => (
            <div key={idx} className="border rounded-md p-3 space-y-2">
              <div className="flex items-center justify-between">
                <Badge>{it.role}</Badge>
                <Button type="button" variant="ghost" size="sm" onClick={() => removeIntervenant(idx)}>
                  Supprimer
                </Button>
              </div>
              <Input
                value={it.raison_sociale}
                onChange={(e) => updateIntervenant(idx, { raison_sociale: e.target.value })}
                placeholder="Raison sociale"
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
                <div className="space-y-1">
                  <Input
                    value={it.telephone ?? ""}
                    onChange={(e) => updateIntervenant(idx, { telephone: e.target.value || null })}
                    placeholder="Téléphone"
                  />
                  <ConfidenceBadge
                    source={fieldSource(idx, "telephone", it.telephone)}
                    confidence={
                      fieldSource(idx, "telephone", it.telephone) === "panneau"
                        ? it.confiance_lecture
                        : undefined
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Input
                    value={it.email ?? ""}
                    onChange={(e) => updateIntervenant(idx, { email: e.target.value || null })}
                    placeholder="Email"
                  />
                  <ConfidenceBadge
                    source={fieldSource(idx, "email", it.email)}
                    confidence={
                      fieldSource(idx, "email", it.email) === "panneau"
                        ? it.confiance_lecture
                        : undefined
                    }
                  />
                </div>
              </div>
              <Input
                value={it.ville ?? ""}
                onChange={(e) => updateIntervenant(idx, { ville: e.target.value || null })}
                placeholder="Ville"
              />
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
        <div className="container max-w-2xl mx-auto">
          <Button onClick={() => handleSave()} disabled={saving} className="w-full h-12 text-lg">
            {saving ? "Enregistrement…" : "Enregistrer le chantier"}
          </Button>
        </div>
      </div>

      {/* Boîte "déjà scanné" : même panneau détecté en base (permis ou adresse+titre). */}
      {duplicate && (
        <Dialog open onOpenChange={(o) => !o && setDuplicate(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {duplicate.same_agence
                  ? "✅ Déjà dans ton agence"
                  : "⚠️ Panneau déjà connu (autre agence)"}
              </DialogTitle>
              <DialogDescription>
                {duplicate.same_agence ? (
                  <>
                    Ce panneau a déjà été scanné dans ton agence par{" "}
                    <strong>{duplicate.owner_name}</strong> le{" "}
                    {new Date(duplicate.created_at).toLocaleDateString("fr-FR")}.
                    Ouvre la fiche commune pour l&apos;enrichir plutôt que créer un
                    doublon.
                  </>
                ) : (
                  <>
                    Un chantier identique a déjà été scanné par{" "}
                    <strong>{duplicate.owner_name}</strong> (autre agence) le{" "}
                    {new Date(duplicate.created_at).toLocaleDateString("fr-FR")}.
                  </>
                )}
              </DialogDescription>
            </DialogHeader>

            <p className="text-sm font-medium">« {duplicate.titre} »</p>
            {!duplicate.same_agence && (
              <p className="text-xs text-muted-foreground">
                La récupération automatique des données entre agences arrivera
                bientôt. Pour l&apos;instant tu peux créer ta propre fiche.
              </p>
            )}

            <DialogFooter className="flex-col sm:flex-row gap-2">
              {duplicate.can_open && (
                <Button
                  variant="outline"
                  onClick={() => router.push(`/chantiers/${duplicate.id}`)}
                >
                  {duplicate.same_agence
                    ? "Ouvrir la fiche commune"
                    : "Ouvrir la fiche existante"}
                </Button>
              )}
              <Button
                variant="ghost"
                onClick={() => {
                  setDuplicate(null);
                  handleSave(true);
                }}
              >
                Créer quand même
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </main>
  );
}
