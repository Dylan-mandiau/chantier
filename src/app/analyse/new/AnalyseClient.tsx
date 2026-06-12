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
  photo_url: string | null;
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
  // Doublon détecté (permis ou adresse+titre) -> ouvre la boîte de dialogue.
  const [duplicate, setDuplicate] = useState<DuplicateInfo | null>(null);
  // L'utilisateur a vu l'alerte doublon et choisi de créer quand même.
  const [forceCreate, setForceCreate] = useState(false);
  // Import inter-agence en cours.
  const [importing, setImporting] = useState(false);
  // Brouillon auto-créé juste après l'analyse → le scan n'est jamais perdu,
  // même si l'utilisateur ne valide pas.
  const [brouillonId, setBrouillonId] = useState<string | null>(null);
  // Corbeille d'intervenants : suppression récupérable pendant la relecture.
  const [deleted, setDeleted] = useState<
    {
      intervenant: AnalyzedPanneau["intervenants"][number];
      iaValue: { telephone: string | null; email: string | null };
    }[]
  >([]);
  const [showDeleted, setShowDeleted] = useState(false);

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

          // Détection PRÉCOCE du doublon : on prévient tout de suite (avant
          // d'éditer) si le panneau est déjà dans l'agence. Simple SELECT
          // indexé (~ms), aucun appel IA. Le garde-fou à l'enregistrement
          // reste actif en filet de sécurité.
          try {
            const dr = await fetch("/api/chantiers/check-duplicate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ projet: parsed.projet }),
            });
            if (dr.ok) {
              const dj = await dr.json();
              if (dj.duplicate && !cancelled) {
                setDuplicate(dj.duplicate as DuplicateInfo);
              } else if (!cancelled) {
                await createBrouillon(parsed); // pas de doublon -> brouillon auto
              }
            } else if (!cancelled) {
              await createBrouillon(parsed);
            }
          } catch {
            // doublon non vérifiable -> on crée quand même le brouillon (anti-perte)
            if (!cancelled) await createBrouillon(parsed);
          }
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

  // Suppression RÉCUPÉRABLE : l'intervenant part dans la corbeille (au lieu
  // d'être perdu). On garde aussi sa valeur IA pour la restauration.
  function removeIntervenant(idx: number) {
    if (!data) return;
    const intervenant = data.intervenants[idx];
    const iaValue = iaValues[idx] ?? { telephone: null, email: null };
    setDeleted((d) => [...d, { intervenant, iaValue }]);
    setData({
      ...data,
      intervenants: data.intervenants.filter((_, i) => i !== idx),
    });
    setIaValues((v) => v.filter((_, i) => i !== idx));
  }

  function restoreIntervenant(di: number) {
    const entry = deleted[di];
    if (!entry || !data) return;
    setData({ ...data, intervenants: [...data.intervenants, entry.intervenant] });
    setIaValues((v) => [...v, entry.iaValue]);
    setDeleted((d) => d.filter((_, i) => i !== di));
  }

  // Crée immédiatement un brouillon (status='brouillon') pour ne jamais perdre
  // le scan. Appelé après l'analyse quand aucun doublon ne bloque, ou quand
  // l'utilisateur choisit « créer quand même ».
  async function createBrouillon(analyzedData: AnalyzedPanneau) {
    if (brouillonId) return;
    try {
      const res = await fetch("/api/chantiers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          photo_path: photoPath,
          lat,
          lng,
          notes: null,
          analyzed: analyzedData,
          brouillon: true,
        }),
      });
      if (res.ok) {
        const { chantier_id } = await res.json();
        setBrouillonId(chantier_id);
        toast.success("Brouillon enregistré — tu le retrouveras dans Brouillons");
        return;
      }
      // Échec serveur : on le REND VISIBLE au lieu de perdre le scan en silence.
      // Cause la plus fréquente : la migration qui autorise status='brouillon'
      // n'est pas encore appliquée côté base (contrainte CHECK qui rejette).
      const body = await res.json().catch(() => ({}));
      console.error("[createBrouillon] échec", res.status, body);
      toast.error(
        "Brouillon non enregistré (erreur serveur). Vérifie la migration ou utilise « Valider et publier »."
      );
    } catch (e) {
      console.error("[createBrouillon] réseau", e);
      // hors ligne : la validation passera par le POST classique
    }
  }

  // Import inter-agence : crée une fiche dans mon agence à partir de la source.
  async function handleImport() {
    if (!duplicate) return;
    setImporting(true);
    try {
      const res = await fetch("/api/chantiers/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_chantier_id: duplicate.id,
          photo_path: photoPath,
          lat,
          lng,
          notes: notes.trim() || null,
        }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? "Échec de l'import");
      }
      const { chantier_id } = await res.json();
      toast.success("Données importées dans ton agence");
      router.push(`/chantiers/${chantier_id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur inconnue");
      setImporting(false);
    }
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

  // Valider = publier le brouillon (brouillon -> actif) avec les données éditées.
  async function handleValidate() {
    if (!data) return;
    if (!brouillonId) {
      // Pas de brouillon (ex. hors ligne / doublon en attente) -> création directe.
      await handleSave(forceCreate);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/chantiers/${brouillonId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notes: notes.trim() || null,
          analyzed: data,
          publier: true,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Échec de la validation");
      toast.success("Chantier publié sur ton tableau de bord");
      router.push(`/chantiers/${brouillonId}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur inconnue");
      setSaving(false);
    }
  }

  async function handleDeleteDraft() {
    if (!brouillonId) {
      router.push("/");
      return;
    }
    if (!confirm("Supprimer ce brouillon ? Le scan sera perdu.")) return;
    setSaving(true);
    try {
      await fetch(`/api/chantiers/${brouillonId}`, { method: "DELETE" });
      toast.success("Brouillon supprimé");
      router.push("/");
    } catch {
      toast.error("Suppression impossible");
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

          {/* Corbeille : intervenants supprimés, récupérables d'un clic */}
          {deleted.length > 0 && (
            <div className="pt-2 border-t">
              <button
                type="button"
                onClick={() => setShowDeleted((v) => !v)}
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
              >
                🗑 Supprimés ({deleted.length}) · {showDeleted ? "masquer" : "récupérer"}
              </button>
              {showDeleted && (
                <div className="mt-2 space-y-2">
                  {deleted.map((d, di) => (
                    <div
                      key={di}
                      className="flex items-center justify-between gap-2 rounded-md border bg-muted/30 p-2"
                    >
                      <span className="min-w-0 truncate text-sm">
                        {d.intervenant.raison_sociale || "(sans nom)"}
                        <span className="text-muted-foreground"> · {d.intervenant.role}</span>
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => restoreIntervenant(di)}
                      >
                        Restaurer
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
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
        <div className="container max-w-2xl mx-auto space-y-1.5">
          <Button onClick={handleValidate} disabled={saving} className="w-full h-12 text-lg">
            {saving ? "…" : "Valider et publier"}
          </Button>
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="text-muted-foreground min-w-0 truncate">
              {brouillonId
                ? "📝 Brouillon enregistré — tu peux quitter sans rien perdre"
                : ""}
            </span>
            <button
              type="button"
              onClick={handleDeleteDraft}
              disabled={saving}
              className="shrink-0 text-destructive hover:underline"
            >
              Supprimer le brouillon
            </button>
          </div>
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
                    Un chantier identique a été scanné par{" "}
                    <strong>{duplicate.owner_name}</strong> (autre agence) le{" "}
                    {new Date(duplicate.created_at).toLocaleDateString("fr-FR")}.
                    Compare la photo ci-dessous : si c&apos;est le même chantier,
                    importe ses données (intervenants, contacts) dans ton agence
                    au lieu de tout re-saisir.
                  </>
                )}
              </DialogDescription>
            </DialogHeader>

            <p className="text-sm font-medium">« {duplicate.titre} »</p>

            {/* Compare-image : la photo de la fiche existante (autre agence) */}
            {!duplicate.same_agence && duplicate.photo_url && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">
                  Photo enregistrée (à comparer avec la tienne) :
                </p>
                <Image
                  src={duplicate.photo_url}
                  alt="Panneau déjà enregistré (autre agence)"
                  width={800}
                  height={600}
                  className="rounded-md w-full h-auto max-h-64 object-contain border bg-muted"
                />
              </div>
            )}

            <DialogFooter className="flex-col sm:flex-row gap-2">
              {duplicate.same_agence ? (
                <>
                  {duplicate.can_open && (
                    <Button
                      variant="outline"
                      onClick={() => router.push(`/chantiers/${duplicate.id}`)}
                    >
                      Ouvrir la fiche commune
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    onClick={() => {
                      // Mémorise le choix : l'utilisateur peut éditer puis
                      // "Valider" sans être ré-alerté. Et on crée le brouillon.
                      setForceCreate(true);
                      setDuplicate(null);
                      if (data) createBrouillon(data);
                    }}
                  >
                    Créer quand même
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    onClick={handleImport}
                    disabled={importing}
                  >
                    {importing ? "Import…" : "Oui — importer les données"}
                  </Button>
                  <Button
                    variant="ghost"
                    disabled={importing}
                    onClick={() => {
                      setForceCreate(true);
                      setDuplicate(null);
                      if (data) createBrouillon(data);
                    }}
                  >
                    Non, c&apos;est un autre → créer
                  </Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </main>
  );
}
