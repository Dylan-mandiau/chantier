import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";

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
  const isAdmin = role === "admin";
  const isManager = role === "rc" || role === "chef_secteur" || isAdmin;

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
      <div className="container flex h-14 items-center justify-between px-4 mx-auto">
        <Link href="/" className="font-bold text-lg">Chantier Insight</Link>
        <div className="flex items-center gap-3">
          <Link href="/entreprises" className="text-sm hover:underline">
            🏢 <span className="hidden sm:inline">Entreprises</span>
          </Link>
          <Link href="/relances" className="text-sm hover:underline">
            🔔 <span className="hidden sm:inline">Relances</span>
          </Link>
          {isManager && (
            <Link href="/admin" className="text-sm hover:underline">
              {isAdmin ? "🛡" : "👥"}{" "}
              <span className="hidden sm:inline">
                {isAdmin ? "Admin" : "Mon équipe"}
              </span>
            </Link>
          )}
          <span className="text-sm text-muted-foreground hidden sm:inline">{displayName}</span>
          <form action="/auth/signout" method="post">
            <Button variant="ghost" size="sm" type="submit">Déconnexion</Button>
          </form>
        </div>
      </div>
    </header>
  );
}
