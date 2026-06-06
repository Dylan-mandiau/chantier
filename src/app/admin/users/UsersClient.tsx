"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Search,
  Trash2,
  Save,
  Building2,
  Users,
  UserPlus,
  KeyRound,
} from "lucide-react";
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

export interface AgenceRow {
  id: string;
  nom: string;
  ville: string | null;
  code: string | null;
}

function userLabel(u: UserRow): string {
  return u.prenom && u.nom ? `${u.prenom} ${u.nom}` : u.email;
}

function normalize(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
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
const ROLE_COLOR: Record<UserRow["role"], string> = {
  commercial: "bg-blue-100 text-blue-800 border-blue-300",
  rc: "bg-purple-100 text-purple-800 border-purple-300",
  chef_secteur: "bg-amber-100 text-amber-800 border-amber-300",
  directeur_commercial: "bg-rose-100 text-rose-800 border-rose-300",
  admin: "bg-red-100 text-red-800 border-red-300 font-semibold",
};

export function UsersClient({
  initialUsers,
  initialAgences,
}: {
  initialUsers: UserRow[];
  initialAgences: AgenceRow[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"agences" | "users">("agences");

  // === Agences ===
  const [agences, setAgences] = useState(initialAgences);
  // Resynchronise avec le serveur après router.refresh() (sinon la liste
  // resterait figée sur la valeur initiale jusqu'au remontage de la page).
  useEffect(() => {
    setAgences(initialAgences);
  }, [initialAgences]);
  const [agencesQ, setAgencesQ] = useState("");
  const [editingAgence, setEditingAgence] = useState<AgenceRow | null>(null);
  const [newAgenceOpen, setNewAgenceOpen] = useState(false);

  const filteredAgences = useMemo(() => {
    const nq = normalize(agencesQ.trim());
    if (!nq) return agences;
    return agences.filter((a) =>
      normalize([a.nom, a.code ?? "", a.ville ?? ""].join(" ")).includes(nq)
    );
  }, [agences, agencesQ]);

  // === Utilisateurs ===
  // Dérivé directement des props : après router.refresh(), la nouvelle liste
  // serveur s'affiche immédiatement (pas de copie figée dans un useState).
  const users = initialUsers;
  const [usersQ, setUsersQ] = useState("");
  const [filterRole, setFilterRole] = useState<string>("");
  const [filterAgence, setFilterAgence] = useState<string>("");
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [newUserOpen, setNewUserOpen] = useState(false);

  const agenceById = useMemo(
    () => new Map(agences.map((a) => [a.id, a])),
    [agences]
  );

  const filteredUsers = useMemo(() => {
    const nq = normalize(usersQ.trim());
    return users.filter((u) => {
      if (filterRole && u.role !== filterRole) return false;
      if (filterAgence && u.agence_id !== filterAgence) return false;
      if (nq) {
        const hay = normalize(
          [u.email, u.nom ?? "", u.prenom ?? ""].join(" ")
        );
        if (!hay.includes(nq)) return false;
      }
      return true;
    });
  }, [users, usersQ, filterRole, filterAgence]);

  // === Compteurs par rôle ===
  const roleCounts = useMemo(() => {
    const c: Record<string, number> = {};
    users.forEach((u) => (c[u.role] = (c[u.role] || 0) + 1));
    return c;
  }, [users]);

  // === Mutations ===
  async function patchUser(
    id: string,
    patch: Partial<
      Pick<UserRow, "role" | "agence_id" | "manager_id" | "nom" | "prenom">
    > & { password?: string }
  ) {
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      toast.error((await res.json()).error ?? "Erreur");
      return false;
    }
    toast.success("Utilisateur mis à jour");
    router.refresh();
    return true;
  }

  async function createUser(payload: {
    email: string;
    password: string;
    nom: string;
    prenom: string;
    role: UserRow["role"];
    agence_id: string | null;
    manager_id: string | null;
  }) {
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: payload.email.trim(),
        password: payload.password,
        nom: payload.nom.trim() || null,
        prenom: payload.prenom.trim() || null,
        role: payload.role,
        agence_id: payload.agence_id,
        manager_id: payload.manager_id,
      }),
    });
    if (!res.ok) {
      toast.error((await res.json()).error ?? "Erreur");
      return false;
    }
    toast.success("Utilisateur créé");
    router.refresh();
    return true;
  }

  async function deleteUser(id: string, label: string) {
    if (
      !confirm(
        `Supprimer ${label} ? Cette action est irréversible. Ses chantiers/relances/contacts restent en base mais perdent leur référence (created_by NULL).`
      )
    )
      return false;
    const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error((await res.json()).error ?? "Erreur");
      return false;
    }
    toast.success("Utilisateur supprimé");
    router.refresh();
    return true;
  }

  async function patchAgence(
    id: string,
    patch: Partial<Pick<AgenceRow, "nom" | "ville" | "code">>
  ) {
    const res = await fetch(`/api/admin/agences/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      toast.error((await res.json()).error ?? "Erreur");
      return false;
    }
    setAgences(
      agences.map((a) =>
        a.id === id
          ? {
              ...a,
              ...patch,
              ...(patch.code !== undefined
                ? {
                    code: patch.code?.trim()
                      ? patch.code.trim().toUpperCase()
                      : null,
                  }
                : {}),
            }
          : a
      )
    );
    toast.success("Agence mise à jour");
    return true;
  }

  async function deleteAgence(id: string, nom: string) {
    if (
      !confirm(
        `Supprimer l'agence "${nom}" ? Les utilisateurs assignés à cette agence seront détachés (mais pas supprimés).`
      )
    )
      return false;
    const res = await fetch(`/api/admin/agences/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error((await res.json()).error ?? "Erreur");
      return false;
    }
    setAgences(agences.filter((a) => a.id !== id));
    toast.success("Agence supprimée");
    router.refresh();
    return true;
  }

  async function createAgence(nom: string, code: string, ville: string) {
    if (!nom.trim()) {
      toast.error("Nom d'agence requis");
      return null;
    }
    const finalCode = code.trim().toUpperCase() || null;
    const res = await fetch("/api/admin/agences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nom: nom.trim(),
        ville: ville.trim() || null,
        code: finalCode,
      }),
    });
    if (!res.ok) {
      toast.error((await res.json()).error ?? "Erreur");
      return null;
    }
    const { agence_id } = await res.json();
    const newOne: AgenceRow = {
      id: agence_id,
      nom: nom.trim(),
      ville: ville.trim() || null,
      code: finalCode,
    };
    setAgences([...agences, newOne]);
    toast.success("Agence créée");
    router.refresh();
    return newOne;
  }

  const tabCls = (active: boolean) =>
    `flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-md border text-sm font-medium transition ${
      active
        ? "bg-primary text-primary-foreground border-primary"
        : "bg-background hover:bg-muted"
    }`;

  return (
    <main className="container max-w-4xl mx-auto p-4 space-y-4 pb-20">
      <div className="flex items-center justify-between">
        <Link href="/admin">
          <Button variant="ghost" size="sm">← Supervision</Button>
        </Link>
        <h1 className="text-lg font-semibold">Utilisateurs &amp; agences</h1>
        <div className="w-28" />
      </div>

      {/* Onglets */}
      <div className="flex gap-2">
        <button onClick={() => setTab("agences")} className={tabCls(tab === "agences")}>
          <Building2 className="size-4" />
          Agences ({agences.length})
        </button>
        <button onClick={() => setTab("users")} className={tabCls(tab === "users")}>
          <Users className="size-4" />
          Utilisateurs ({users.length})
        </button>
      </div>

      {tab === "agences" ? (
        <>
          {/* Barre recherche + bouton nouvelle agence */}
          <Card>
            <CardContent className="p-3 flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={agencesQ}
                  onChange={(e) => setAgencesQ(e.target.value)}
                  placeholder="Rechercher une agence (nom, code, ville)…"
                  className="pl-9"
                />
              </div>
              <Button onClick={() => setNewAgenceOpen(true)}>
                <Plus className="size-4 mr-1" />
                Nouvelle agence
              </Button>
            </CardContent>
          </Card>

          {/* Grille d'agences */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {filteredAgences.length === 0 && (
              <p className="col-span-full text-sm text-muted-foreground text-center py-8">
                Aucune agence ne correspond.
              </p>
            )}
            {filteredAgences
              .slice()
              .sort((a, b) => a.nom.localeCompare(b.nom))
              .map((a) => (
                <button
                  key={a.id}
                  onClick={() => setEditingAgence(a)}
                  className="text-left border rounded-lg p-3 bg-card hover:bg-muted/50 hover:border-primary/50 transition group"
                >
                  <div className="flex items-baseline gap-2">
                    {a.code && (
                      <span className="text-lg font-bold text-primary tabular-nums">
                        {a.code}
                      </span>
                    )}
                    <span className="text-sm font-medium truncate group-hover:underline">
                      {a.nom}
                    </span>
                  </div>
                  {a.ville && a.ville !== a.nom && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      📍 {a.ville}
                    </p>
                  )}
                </button>
              ))}
          </div>
        </>
      ) : (
        <>
          {/* Stats compteurs par rôle */}
          <Card>
            <CardContent className="p-3 flex flex-wrap gap-2">
              {ROLES.filter((r) => roleCounts[r]).map((r) => (
                <button
                  key={r}
                  onClick={() => setFilterRole(filterRole === r ? "" : r)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition ${
                    filterRole === r
                      ? ROLE_COLOR[r]
                      : "bg-background hover:bg-muted text-muted-foreground"
                  }`}
                >
                  {ROLE_LABEL[r]} · {roleCounts[r]}
                </button>
              ))}
              {(filterRole || filterAgence) && (
                <button
                  onClick={() => {
                    setFilterRole("");
                    setFilterAgence("");
                  }}
                  className="text-xs px-2.5 py-1 rounded-full border bg-background hover:bg-muted text-muted-foreground"
                >
                  ✕ Réinitialiser filtres
                </button>
              )}
            </CardContent>
          </Card>

          {/* Recherche + filtre agence + nouvel user */}
          <Card>
            <CardContent className="p-3 flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={usersQ}
                  onChange={(e) => setUsersQ(e.target.value)}
                  placeholder="Rechercher (nom, prénom, email)…"
                  className="pl-9"
                />
              </div>
              <select
                className="bg-background border rounded px-3 py-2 text-sm"
                value={filterAgence}
                onChange={(e) => setFilterAgence(e.target.value)}
              >
                <option value="">Toutes les agences</option>
                {agences.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.code ? `${a.code} · ` : ""}
                    {a.nom}
                  </option>
                ))}
              </select>
              <Button onClick={() => setNewUserOpen(true)}>
                <UserPlus className="size-4 mr-1" />
                Nouvel utilisateur
              </Button>
            </CardContent>
          </Card>

          {/* Liste users compacte */}
          <div className="space-y-1.5">
            {filteredUsers.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                Aucun utilisateur ne correspond.
              </p>
            )}
            {filteredUsers.map((u) => {
              const ag = u.agence_id ? agenceById.get(u.agence_id) : null;
              const manager = u.manager_id
                ? users.find((m) => m.id === u.manager_id)
                : null;
              return (
                <button
                  key={u.id}
                  onClick={() => setEditingUser(u)}
                  className="w-full text-left border rounded-lg p-3 bg-card hover:bg-muted/50 hover:border-primary/50 transition flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{userLabel(u)}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {u.email}
                      {manager ? ` · N+1 : ${userLabel(manager)}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Badge variant="outline" className={`text-xs ${ROLE_COLOR[u.role]}`}>
                      {ROLE_LABEL[u.role]}
                    </Badge>
                    {ag ? (
                      <Badge variant="outline" className="text-xs">
                        {ag.code ?? ag.nom}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">
                        sans agence
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* === Modal édition agence === */}
      {editingAgence && (
        <EditAgenceDialog
          agence={editingAgence}
          onClose={() => setEditingAgence(null)}
          onSave={async (patch) => {
            const ok = await patchAgence(editingAgence.id, patch);
            if (ok) setEditingAgence(null);
          }}
          onDelete={async () => {
            const ok = await deleteAgence(editingAgence.id, editingAgence.nom);
            if (ok) setEditingAgence(null);
          }}
        />
      )}

      {/* === Modal nouvelle agence === */}
      {newAgenceOpen && (
        <NewAgenceDialog
          onClose={() => setNewAgenceOpen(false)}
          onCreate={async (nom, code, ville) => {
            const r = await createAgence(nom, code, ville);
            if (r) setNewAgenceOpen(false);
          }}
        />
      )}

      {/* === Modal édition utilisateur === */}
      {editingUser && (
        <EditUserDialog
          user={editingUser}
          agences={agences}
          allUsers={users}
          onClose={() => setEditingUser(null)}
          onSave={async (patch) => {
            const ok = await patchUser(editingUser.id, patch);
            if (ok) setEditingUser(null);
          }}
          onDelete={async () => {
            const ok = await deleteUser(editingUser.id, userLabel(editingUser));
            if (ok) setEditingUser(null);
          }}
        />
      )}

      {/* === Modal création utilisateur === */}
      {newUserOpen && (
        <NewUserDialog
          agences={agences}
          allUsers={users}
          onClose={() => setNewUserOpen(false)}
          onCreate={createUser}
        />
      )}
    </main>
  );
}

// ============================================================================
// Dialog : édition d'une agence existante
// ============================================================================
function EditAgenceDialog({
  agence,
  onClose,
  onSave,
  onDelete,
}: {
  agence: AgenceRow;
  onClose: () => void;
  onSave: (patch: { nom: string; code: string | null; ville: string | null }) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [nom, setNom] = useState(agence.nom);
  const [code, setCode] = useState(agence.code ?? "");
  const [ville, setVille] = useState(agence.ville ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    await onSave({
      nom: nom.trim(),
      code: code.trim() || null,
      ville: ville.trim() || null,
    });
    setSaving(false);
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifier l&apos;agence</DialogTitle>
          <DialogDescription>
            {agence.code && (
              <span className="font-mono font-bold text-primary mr-2">
                {agence.code}
              </span>
            )}
            {agence.nom}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Nom</Label>
              <Input value={nom} onChange={(e) => setNom(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Code</Label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                maxLength={10}
                className="uppercase"
                placeholder="MN"
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Ville</Label>
            <Input value={ville} onChange={(e) => setVille(e.target.value)} />
          </div>
        </div>
        <DialogFooter className="flex-row gap-2 sm:justify-between">
          <Button variant="ghost" size="sm" onClick={onDelete} className="text-destructive">
            <Trash2 className="size-3.5 mr-1" />
            Supprimer
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={saving}>
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={saving || !nom.trim()}>
              <Save className="size-3.5 mr-1" />
              {saving ? "..." : "Enregistrer"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Dialog : création d'une nouvelle agence
// ============================================================================
function NewAgenceDialog({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (nom: string, code: string, ville: string) => Promise<void>;
}) {
  const [nom, setNom] = useState("");
  const [code, setCode] = useState("");
  const [ville, setVille] = useState("");
  const [creating, setCreating] = useState(false);

  async function handleCreate() {
    setCreating(true);
    await onCreate(nom, code, ville);
    setCreating(false);
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouvelle agence</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Nom *</Label>
              <Input
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                placeholder="ex: Le Mans"
                autoFocus
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Code</Label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                maxLength={10}
                className="uppercase"
                placeholder="MN"
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Ville (optionnel)</Label>
            <Input
              value={ville}
              onChange={(e) => setVille(e.target.value)}
              placeholder="Le Mans"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={creating}>
            Annuler
          </Button>
          <Button onClick={handleCreate} disabled={creating || !nom.trim()}>
            <Plus className="size-3.5 mr-1" />
            {creating ? "..." : "Créer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Dialog : édition d'un utilisateur
// ============================================================================
function EditUserDialog({
  user,
  agences,
  allUsers,
  onClose,
  onSave,
  onDelete,
}: {
  user: UserRow;
  agences: AgenceRow[];
  allUsers: UserRow[];
  onClose: () => void;
  onSave: (
    patch: Partial<
      Pick<UserRow, "role" | "agence_id" | "manager_id" | "nom" | "prenom">
    > & { password?: string }
  ) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [nom, setNom] = useState(user.nom ?? "");
  const [prenom, setPrenom] = useState(user.prenom ?? "");
  const [role, setRole] = useState(user.role);
  const [agenceId, setAgenceId] = useState(user.agence_id ?? "");
  const [managerId, setManagerId] = useState(user.manager_id ?? "");
  const [changePwd, setChangePwd] = useState(false);
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (changePwd && password.length < 8) {
      toast.error("Mot de passe : 8 caractères minimum.");
      return;
    }
    setSaving(true);
    const patch: Partial<
      Pick<UserRow, "role" | "agence_id" | "manager_id" | "nom" | "prenom">
    > & { password?: string } = {
      role,
      agence_id: agenceId || null,
      manager_id: managerId || null,
      nom: nom.trim() ? nom.trim() : null,
      prenom: prenom.trim() ? prenom.trim() : null,
    };
    if (changePwd && password) {
      patch.password = password;
    }
    await onSave(patch);
    setSaving(false);
  }

  const selectCls = "w-full bg-background border rounded px-3 py-2 text-sm";

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{userLabel(user)}</DialogTitle>
          <DialogDescription>{user.email}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Prénom</Label>
              <Input value={prenom} onChange={(e) => setPrenom(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Nom</Label>
              <Input value={nom} onChange={(e) => setNom(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Rôle</Label>
            <select
              className={selectCls}
              value={role}
              onChange={(e) => setRole(e.target.value as UserRow["role"])}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>{ROLE_LABEL[r]}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Agence</Label>
            <select
              className={selectCls}
              value={agenceId}
              onChange={(e) => setAgenceId(e.target.value)}
            >
              <option value="">— Aucune —</option>
              {agences
                .slice()
                .sort((a, b) => a.nom.localeCompare(b.nom))
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.code ? `${a.code} · ` : ""}
                    {a.nom}
                  </option>
                ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Manager (N+1)</Label>
            <select
              className={selectCls}
              value={managerId}
              onChange={(e) => setManagerId(e.target.value)}
            >
              <option value="">— Aucun —</option>
              {allUsers
                .filter((m) => m.id !== user.id)
                .slice()
                .sort((a, b) => userLabel(a).localeCompare(userLabel(b)))
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {userLabel(m)} · {ROLE_LABEL[m.role]}
                  </option>
                ))}
            </select>
          </div>

          {/* Section mot de passe */}
          <div className="border-t pt-3 space-y-2">
            {!changePwd ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setChangePwd(true)}
                className="w-full"
              >
                <KeyRound className="size-3.5 mr-1" />
                Changer le mot de passe
              </Button>
            ) : (
              <div className="space-y-1">
                <Label className="text-xs">
                  Nouveau mot de passe (8 caractères min.)
                </Label>
                <Input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setChangePwd(false);
                    setPassword("");
                  }}
                >
                  Annuler le changement de mot de passe
                </button>
              </div>
            )}
          </div>

          {/* Section suppression */}
          <div className="border-t pt-3">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={async () => {
                setSaving(true);
                await onDelete();
                setSaving(false);
              }}
              disabled={saving}
              className="w-full"
            >
              <Trash2 className="size-3.5 mr-1" />
              Supprimer cet utilisateur
            </Button>
            <p className="text-xs text-muted-foreground mt-1.5">
              Le compte auth + son profile sont supprimés. Ses chantiers et relances
              restent en base mais perdent leur référence (created_by NULL).
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="size-3.5 mr-1" />
            {saving ? "..." : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Dialog : création d'un nouvel utilisateur
// ============================================================================
function NewUserDialog({
  agences,
  allUsers,
  onClose,
  onCreate,
}: {
  agences: AgenceRow[];
  allUsers: UserRow[];
  onClose: () => void;
  onCreate: (payload: {
    email: string;
    password: string;
    nom: string;
    prenom: string;
    role: UserRow["role"];
    agence_id: string | null;
    manager_id: string | null;
  }) => Promise<boolean>;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [role, setRole] = useState<UserRow["role"]>("commercial");
  const [agenceId, setAgenceId] = useState("");
  const [managerId, setManagerId] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    if (!email.trim()) {
      toast.error("Email requis.");
      return;
    }
    if (password.length < 8) {
      toast.error("Mot de passe : 8 caractères minimum.");
      return;
    }
    setSaving(true);
    const ok = await onCreate({
      email,
      password,
      nom,
      prenom,
      role,
      agence_id: agenceId || null,
      manager_id: managerId || null,
    });
    setSaving(false);
    if (ok) onClose();
  }

  const selectCls = "w-full bg-background border rounded px-3 py-2 text-sm";

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nouvel utilisateur</DialogTitle>
          <DialogDescription>
            Crée un compte SALTI. L&apos;utilisateur pourra se connecter immédiatement
            avec l&apos;email et le mot de passe ci-dessous.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Email *</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="prenom.nom@salti.fr"
              autoComplete="off"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">
              Mot de passe * (8 caractères min.)
            </Label>
            <Input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Prénom</Label>
              <Input value={prenom} onChange={(e) => setPrenom(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Nom</Label>
              <Input value={nom} onChange={(e) => setNom(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Rôle</Label>
            <select
              className={selectCls}
              value={role}
              onChange={(e) => setRole(e.target.value as UserRow["role"])}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>{ROLE_LABEL[r]}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Agence</Label>
            <select
              className={selectCls}
              value={agenceId}
              onChange={(e) => setAgenceId(e.target.value)}
            >
              <option value="">— Aucune —</option>
              {agences
                .slice()
                .sort((a, b) => a.nom.localeCompare(b.nom))
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.code ? `${a.code} · ` : ""}
                    {a.nom}
                  </option>
                ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Manager (N+1)</Label>
            <select
              className={selectCls}
              value={managerId}
              onChange={(e) => setManagerId(e.target.value)}
            >
              <option value="">— Aucun —</option>
              {allUsers
                .slice()
                .sort((a, b) => userLabel(a).localeCompare(userLabel(b)))
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {userLabel(m)} · {ROLE_LABEL[m.role]}
                  </option>
                ))}
            </select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Annuler
          </Button>
          <Button onClick={handleCreate} disabled={saving}>
            <UserPlus className="size-3.5 mr-1" />
            {saving ? "Création…" : "Créer l'utilisateur"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
