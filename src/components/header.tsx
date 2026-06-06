import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { MobileNav } from "@/components/mobile-nav";

const ROLE_LABEL: Record<string, string> = {
  commercial: "Commercial",
  rc: "Responsable commercial",
  chef_secteur: "Chef de secteur",
  directeur_commercial: "Directeur commercial",
  admin: "Administrateur",
};

export async function Header() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("nom, prenom, email, role")
    .eq("id", user.id)
    .single();

  const displayName =
    profile?.prenom && profile?.nom
      ? `${profile.prenom} ${profile.nom}`
      : profile?.email ?? "Utilisateur";

  const role = profile?.role ?? "";
  const roleLabel = ROLE_LABEL[role] ?? "";
  const isAdmin = role === "admin";
  const isManager =
    role === "rc" ||
    role === "chef_secteur" ||
    role === "directeur_commercial" ||
    isAdmin;

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
      <div className="container flex h-14 items-center justify-between px-4 mx-auto">
        <Link href="/" className="font-bold text-lg">Chantier Insight</Link>

        {/* Desktop : liens texte complets */}
        <div className="hidden sm:flex items-center gap-3">
          <Link href="/entreprises" className="text-sm hover:underline">
            🏢 Entreprises
          </Link>
          <Link href="/relances" className="text-sm hover:underline">
            🔔 Relances
          </Link>
          {isManager && (
            <Link href="/admin" className="text-sm hover:underline">
              {isAdmin ? "🛡 Admin" : "👥 Mon équipe"}
            </Link>
          )}
          <span className="text-sm text-muted-foreground">{displayName}</span>
          <form action="/auth/signout" method="post">
            <Button variant="ghost" size="sm" type="submit">Déconnexion</Button>
          </form>
        </div>

        {/* Mobile (GSM) : menu hamburger ☰ avec libellés texte */}
        <div className="sm:hidden">
          <MobileNav
            displayName={displayName}
            roleLabel={roleLabel}
            isManager={isManager}
            isAdmin={isAdmin}
          />
        </div>
      </div>
    </header>
  );
}
