"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatutCommercialBadge } from "@/components/statut-commercial-badge";
import { Pencil, Save, X } from "lucide-react";
import { toast } from "sonner";
import type { StatutCommercial } from "@/lib/statut/compute";

export interface EntrepriseDetail {
  id: string;
  raison_sociale: string;
  siret: string | null;
  telephone: string | null;
  email: string | null;
  site_web: string | null;
  adresse: string | null;
  ville: string | null;
  code_postal: string | null;
  code_client_salti: string | null;
  statut: StatutCommercial;
  chantiers: { id: string; titre: string; ville: string | null; lots: string[] }[];
  relances: { id: string; date_relance: string; motif: string; status: string }[];
  contacts: { id: string; envoye_at: string; sujet: string; statut: string }[];
}

type EditableFields = {
  telephone: string;
  email: string;
  site_web: string;
  adresse: string;
  code_postal: string;
  ville: string;
  code_client_salti: string;
};

export function EntrepriseClient({ detail }: { detail: EntrepriseDetail }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<EditableFields>({
    telephone: detail.telephone ?? "",
    email: detail.email ?? "",
    site_web: detail.site_web ?? "",
    adresse: detail.adresse ?? "",
    code_postal: detail.code_postal ?? "",
    ville: detail.ville ?? "",
    code_client_salti: detail.code_client_salti ?? "",
  });

  function setField(k: keyof EditableFields, v: string) {
    setForm({ ...form, [k]: v });
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/entreprises/${detail.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Entreprise mise à jour");
      setEditing(false);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="container max-w-2xl mx-auto p-4 space-y-4 pb-20">
      <div className="flex items-center justify-between gap-2">
        <Link href="/entreprises">
          <Button variant="ghost" size="sm">← Entreprises</Button>
        </Link>
        {!editing && (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="size-3.5 mr-1" /> Modifier
          </Button>
        )}
      </div>

      {/* Identité + statut */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 flex-wrap">
            <CardTitle>{detail.raison_sociale}</CardTitle>
            <StatutCommercialBadge statut={detail.statut} />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {!editing ? (
            <div className="space-y-1 text-sm">
              {detail.code_client_salti && (
                <p className="font-medium text-purple-700">
                  ⭐ Code client SALTI : {detail.code_client_salti}
                </p>
              )}
              {detail.siret && <p>🆔 SIRET {detail.siret}</p>}
              {detail.telephone && (
                <p>
                  📞 <a href={`tel:${detail.telephone}`} className="underline">{detail.telephone}</a>
                </p>
              )}
              {detail.email && (
                <p>
                  📧 <a href={`mailto:${detail.email}`} className="underline">{detail.email}</a>
                </p>
              )}
              {detail.site_web && (
                <p>
                  🌐 <a href={detail.site_web} target="_blank" rel="noreferrer" className="underline">{detail.site_web}</a>
                </p>
              )}
              {(detail.adresse || detail.code_postal || detail.ville) && (
                <p>
                  📍 {detail.adresse} {detail.code_postal} {detail.ville}
                </p>
              )}
              {!detail.telephone && !detail.email && (
                <p className="text-muted-foreground">
                  Aucune coordonnée. Clique sur « Modifier » pour en ajouter.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Code client SALTI</Label>
                <Input
                  value={form.code_client_salti}
                  onChange={(e) => setField("code_client_salti", e.target.value)}
                  placeholder="ex: RENOCHEV (le rend ⭐ Client SALTI)"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Téléphone</Label>
                  <Input
                    value={form.telephone}
                    onChange={(e) => setField("telephone", e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Email</Label>
                  <Input
                    value={form.email}
                    onChange={(e) => setField("email", e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Site web</Label>
                <Input
                  value={form.site_web}
                  onChange={(e) => setField("site_web", e.target.value)}
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-1">
                <Label>Adresse</Label>
                <Input
                  value={form.adresse}
                  onChange={(e) => setField("adresse", e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Code postal</Label>
                  <Input
                    value={form.code_postal}
                    onChange={(e) => setField("code_postal", e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Ville</Label>
                  <Input
                    value={form.ville}
                    onChange={(e) => setField("ville", e.target.value)}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setEditing(false)} disabled={saving}>
                  <X className="size-3.5 mr-1" /> Annuler
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  <Save className="size-3.5 mr-1" /> {saving ? "..." : "Enregistrer"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Chantiers associés */}
      <Card>
        <CardHeader>
          <CardTitle>
            Chantiers ({detail.chantiers.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {detail.chantiers.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Aucun chantier associé (visible par toi).
            </p>
          )}
          {detail.chantiers.map((c) => (
            <Link key={c.id} href={`/chantiers/${c.id}`}>
              <div className="border rounded p-3 hover:bg-muted transition-colors">
                <p className="font-medium">{c.titre}</p>
                {c.ville && (
                  <p className="text-xs text-muted-foreground">📍 {c.ville}</p>
                )}
                <div className="flex flex-wrap gap-1 mt-1">
                  {c.lots.map((lot, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {lot}
                    </Badge>
                  ))}
                </div>
              </div>
            </Link>
          ))}
        </CardContent>
      </Card>

      {/* Relances en cours */}
      {detail.relances.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Relances prévues ({detail.relances.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {detail.relances.map((r) => (
              <div key={r.id} className="border-l-4 border-l-yellow-400 pl-3 py-1">
                <p className="text-sm font-medium">
                  📅{" "}
                  {new Intl.DateTimeFormat("fr-FR", {
                    day: "2-digit",
                    month: "short",
                  }).format(new Date(r.date_relance))}
                </p>
                <p className="text-sm italic text-muted-foreground">&quot;{r.motif}&quot;</p>
              </div>
            ))}
            <Link href="/relances" className="text-xs underline text-muted-foreground">
              Gérer mes relances →
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Historique des contacts */}
      {detail.contacts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Historique des contacts ({detail.contacts.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {detail.contacts.map((c) => (
              <div key={c.id} className="text-sm border-b pb-2 last:border-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">
                    {new Intl.DateTimeFormat("fr-FR", {
                      dateStyle: "short",
                    }).format(new Date(c.envoye_at))}
                  </span>
                  <Badge variant="outline" className="text-xs">{c.statut}</Badge>
                </div>
                <p className="truncate">{c.sujet}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </main>
  );
}
