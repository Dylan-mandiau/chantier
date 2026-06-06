"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { toast } from "sonner";

export interface UserRow {
  id: string;
  email: string;
  nom: string | null;
  prenom: string | null;
  role: "commercial" | "rc" | "chef_secteur" | "directeur_commercial" | "admin";
  agence_id: string | null;
  manager_id: string | null;
}

function userLabel(u: UserRow): string {
  return u.prenom && u.nom ? `${u.prenom} ${u.nom}` : u.email;
}

export interface AgenceRow {
  id: string;
  nom: string;
  ville: string | null;
}

const ROLES: UserRow["role"][] = [
  "commercial",
  "rc",
  "chef_secteur",
  "directeur_commercial",
  "admin",
];
const ROLE_LABEL: Record<UserRow["role"], string> = {
  commercial: "Commercial",
  rc: "Resp. commercial",
  chef_secteur: "Chef de secteur",
  directeur_commercial: "Directeur commercial",
  admin: "Admin",
};

export function UsersClient({
  initialUsers,
  initialAgences,
}: {
  initialUsers: UserRow[];
  initialAgences: AgenceRow[];
}) {
  const router = useRouter();
  const [agences, setAgences] = useState(initialAgences);
  const [newAgence, setNewAgence] = useState("");
  const [newAgenceVille, setNewAgenceVille] = useState("");
  const [creating, setCreating] = useState(false);

  async function patchUser(
    id: string,
    patch: Partial<Pick<UserRow, "role" | "agence_id" | "manager_id">>
  ) {
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      toast.error((await res.json()).error ?? "Erreur");
      return;
    }
    toast.success("Utilisateur mis à jour");
    router.refresh();
  }

  async function createAgence() {
    if (!newAgence.trim()) {
      toast.error("Nom d'agence requis");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/admin/agences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nom: newAgence.trim(),
          ville: newAgenceVille.trim() || null,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const { agence_id } = await res.json();
      setAgences([
        ...agences,
        { id: agence_id, nom: newAgence.trim(), ville: newAgenceVille.trim() || null },
      ]);
      setNewAgence("");
      setNewAgenceVille("");
      toast.success("Agence créée");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setCreating(false);
    }
  }

  const selectCls = "bg-background border rounded px-2 py-1 text-sm";

  return (
    <main className="container max-w-3xl mx-auto p-4 space-y-4 pb-20">
      <div className="flex items-center justify-between">
        <Link href="/admin">
          <Button variant="ghost" size="sm">← Supervision</Button>
        </Link>
        <h1 className="text-lg font-semibold">Utilisateurs & agences</h1>
        <div className="w-24" />
      </div>

      {/* Agences */}
      <Card>
        <CardHeader>
          <CardTitle>Agences ({agences.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {agences.map((a) => (
              <span
                key={a.id}
                className="text-xs px-2 py-1 rounded border bg-muted"
              >
                {a.nom}
                {a.ville ? ` · ${a.ville}` : ""}
              </span>
            ))}
            {agences.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Aucune agence. Crée la première ci-dessous.
              </p>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
            <div className="space-y-1">
              <Label className="text-xs">Nom de l&apos;agence</Label>
              <Input
                value={newAgence}
                onChange={(e) => setNewAgence(e.target.value)}
                placeholder="ex: Agence Le Mans"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Ville (optionnel)</Label>
              <Input
                value={newAgenceVille}
                onChange={(e) => setNewAgenceVille(e.target.value)}
                placeholder="Le Mans"
              />
            </div>
            <Button onClick={createAgence} disabled={creating}>
              <Plus className="size-3.5 mr-1" /> Créer
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Utilisateurs */}
      <Card>
        <CardHeader>
          <CardTitle>Utilisateurs ({initialUsers.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {initialUsers.map((u) => (
            <div
              key={u.id}
              className="border rounded p-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-between"
            >
              <div className="min-w-0">
                <p className="font-medium truncate">
                  {u.prenom && u.nom ? `${u.prenom} ${u.nom}` : u.email}
                </p>
                <p className="text-xs text-muted-foreground truncate">{u.email}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <div className="space-y-0.5">
                  <Label className="text-[10px] text-muted-foreground">Rôle</Label>
                  <select
                    className={selectCls}
                    defaultValue={u.role}
                    onChange={(e) =>
                      patchUser(u.id, { role: e.target.value as UserRow["role"] })
                    }
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>{ROLE_LABEL[r]}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-0.5">
                  <Label className="text-[10px] text-muted-foreground">Agence</Label>
                  <select
                    className={selectCls}
                    defaultValue={u.agence_id ?? ""}
                    onChange={(e) =>
                      patchUser(u.id, { agence_id: e.target.value || null })
                    }
                  >
                    <option value="">— Aucune —</option>
                    {agences.map((a) => (
                      <option key={a.id} value={a.id}>{a.nom}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-0.5">
                  <Label className="text-[10px] text-muted-foreground">
                    Manager (N+1)
                  </Label>
                  <select
                    className={selectCls}
                    defaultValue={u.manager_id ?? ""}
                    onChange={(e) =>
                      patchUser(u.id, { manager_id: e.target.value || null })
                    }
                  >
                    <option value="">— Aucun —</option>
                    {initialUsers
                      .filter((m) => m.id !== u.id)
                      .map((m) => (
                        <option key={m.id} value={m.id}>
                          {userLabel(m)} ({ROLE_LABEL[m.role]})
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </main>
  );
}
