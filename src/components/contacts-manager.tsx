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
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ContactActions } from "@/components/contact-actions";
import { Plus, Pencil, Trash2, UserPlus, History } from "lucide-react";
import { toast } from "sonner";

export interface Personne {
  id: string;
  prenom: string | null;
  nom: string | null;
  fonction: string | null;
  telephone: string | null;
  telephone_portable: string | null;
  email: string | null;
  compte_extranet: boolean;
  notes: string | null;
  auteur: string | null;
}

export interface ContactAudit {
  id: string;
  action: string;
  contact_label: string | null;
  changements: Record<string, { avant: unknown; apres: unknown }> | null;
  modifie_at: string;
  auteur: string | null;
}

type FormState = {
  prenom: string;
  nom: string;
  fonction: string;
  telephone: string;
  telephone_portable: string;
  email: string;
  compte_extranet: boolean;
  notes: string;
};

const EMPTY: FormState = {
  prenom: "",
  nom: "",
  fonction: "",
  telephone: "",
  telephone_portable: "",
  email: "",
  compte_extranet: false,
  notes: "",
};

const FIELD_LABELS: Record<string, string> = {
  prenom: "Prénom",
  nom: "Nom",
  fonction: "Fonction",
  telephone: "Téléphone",
  telephone_portable: "Portable",
  email: "Email",
  compte_extranet: "Compte extranet",
  notes: "Notes",
};

function personneNom(p: Personne) {
  return [p.prenom, p.nom].filter(Boolean).join(" ").trim() || "Contact sans nom";
}

export function ContactsManager({
  entrepriseId,
  personnes,
  audit,
}: {
  entrepriseId: string;
  personnes: Personne[];
  audit: ContactAudit[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<Personne | null>(null); // null = fermé
  const [isNew, setIsNew] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [showAudit, setShowAudit] = useState(false);

  function openNew() {
    setForm(EMPTY);
    setIsNew(true);
    setEditing({ id: "" } as Personne);
  }

  function openEdit(p: Personne) {
    setForm({
      prenom: p.prenom ?? "",
      nom: p.nom ?? "",
      fonction: p.fonction ?? "",
      telephone: p.telephone ?? "",
      telephone_portable: p.telephone_portable ?? "",
      email: p.email ?? "",
      compte_extranet: p.compte_extranet,
      notes: p.notes ?? "",
    });
    setIsNew(false);
    setEditing(p);
  }

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function save() {
    setSaving(true);
    try {
      const url = isNew
        ? `/api/entreprises/${entrepriseId}/contacts`
        : `/api/entreprises/${entrepriseId}/contacts/${editing!.id}`;
      const res = await fetch(url, {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Erreur");
      toast.success(isNew ? "Contact ajouté" : "Contact mis à jour");
      setEditing(null);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  async function remove(p: Personne) {
    if (!confirm(`Supprimer le contact « ${personneNom(p)} » ?`)) return;
    const res = await fetch(
      `/api/entreprises/${entrepriseId}/contacts/${p.id}`,
      { method: "DELETE" }
    );
    if (!res.ok) {
      toast.error((await res.json()).error ?? "Erreur");
      return;
    }
    toast.success("Contact supprimé");
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {personnes.length} contact{personnes.length > 1 ? "s" : ""}
        </p>
        <Button size="sm" onClick={openNew}>
          <UserPlus className="size-4 mr-1" /> Ajouter
        </Button>
      </div>

      {personnes.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Aucun contact. Ajoute les interlocuteurs de cette entreprise.
        </p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {personnes.map((p) => (
            <div key={p.id} className="border rounded-lg p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium truncate">{personneNom(p)}</p>
                  {p.fonction && (
                    <p className="text-xs text-muted-foreground">{p.fonction}</p>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  {p.compte_extranet && (
                    <Badge variant="secondary" className="text-[10px]">extranet</Badge>
                  )}
                  <Button variant="ghost" size="icon-sm" onClick={() => openEdit(p)} aria-label="Modifier">
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon-sm" onClick={() => remove(p)} aria-label="Supprimer">
                    <Trash2 className="size-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
              {p.telephone_portable && (
                <p className="text-xs text-muted-foreground">📱 {p.telephone_portable}</p>
              )}
              <ContactActions
                telephone={p.telephone ?? p.telephone_portable}
                email={p.email}
                nom={personneNom(p)}
              />
              {p.auteur && (
                <p className="text-[11px] text-muted-foreground">👤 {p.auteur}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Traçabilité */}
      {audit.length > 0 && (
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setShowAudit((v) => !v)}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <History className="size-3.5" />
            {showAudit ? "Masquer" : "Voir"} l&apos;historique ({audit.length})
          </button>
          {showAudit && (
            <ul className="mt-2 space-y-1.5 text-xs">
              {audit.map((a) => (
                <li key={a.id} className="border-l-2 border-l-border pl-2">
                  <span className="text-muted-foreground">
                    {new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" }).format(new Date(a.modifie_at))}
                  </span>{" "}
                  — <strong>{a.auteur ?? "?"}</strong> · {a.action} ·{" "}
                  {a.contact_label}
                  {a.changements && Object.keys(a.changements).length > 0 && (
                    <span className="text-muted-foreground">
                      {" "}({Object.keys(a.changements).map((k) => FIELD_LABELS[k] ?? k).join(", ")})
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Dialog ajout / édition */}
      {editing && (
        <Dialog open onOpenChange={(o) => !o && setEditing(null)}>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {isNew ? (
                  <><Plus className="size-4 mr-1 inline" /> Nouveau contact</>
                ) : (
                  "Modifier le contact"
                )}
              </DialogTitle>
              <DialogDescription>Interlocuteur de cette entreprise.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Prénom</Label>
                  <Input value={form.prenom} onChange={(e) => set("prenom", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Nom</Label>
                  <Input value={form.nom} onChange={(e) => set("nom", e.target.value)} />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Fonction</Label>
                <Input value={form.fonction} onChange={(e) => set("fonction", e.target.value)} placeholder="chef de chantier, conducteur de travaux…" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Téléphone</Label>
                  <Input value={form.telephone} onChange={(e) => set("telephone", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Portable</Label>
                  <Input value={form.telephone_portable} onChange={(e) => set("telephone_portable", e.target.value)} />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Email</Label>
                <Input value={form.email} onChange={(e) => set("email", e.target.value)} />
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.compte_extranet}
                  onChange={(e) => set("compte_extranet", e.target.checked)}
                />
                Compte extranet actif
              </label>
              <div className="space-y-1">
                <Label className="text-xs">Notes</Label>
                <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setEditing(null)} disabled={saving}>
                Annuler
              </Button>
              <Button onClick={save} disabled={saving}>
                {saving ? "..." : isNew ? "Ajouter" : "Enregistrer"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
