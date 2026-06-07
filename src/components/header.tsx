import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { MobileNav } from "@/components/mobile-nav";
import { MainNav } from "@/components/main-nav";
import { BottomNav } from "@/components/bottom-nav";

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

  const initials = (
    profile?.prenom && profile?.nom
      ? profile.prenom[0] + profile.nom[0]
      : (profile?.email ?? "?").slice(0, 2)
  ).toUpperCase();

  const role = profile?.role ?? "";
  const roleLabel = ROLE_LABEL[role] ?? "";
  const isAdmin = role === "admin";
  const isManager =
    role === "rc" ||
    role === "chef_secteur" ||
    role === "directeur_commercial" ||
    isAdmin;

  return (
    <>
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
      <div className="container mx-auto flex h-14 items-center justify-between gap-3 px-4">
        <Link href="/" className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-salti.svg" alt="SALTI" className="h-8 w-auto" />
          <span className="hidden border-l pl-2.5 text-base font-bold sm:inline">
            Chantier Insight
          </span>
        </Link>

        {/* Desktop : nav + profil */}
        <div className="hidden sm:block">
          <MainNav
            displayName={displayName}
            roleLabel={roleLabel}
            initials={initials}
            isManager={isManager}
            isAdmin={isAdmin}
          />
        </div>

        {/* Mobile : menu hamburger */}
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
      <BottomNav />
    </>
  );
}
