"use client";

import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Menu,
  HardHat,
  Building2,
  Bell,
  Shield,
  Users,
  LogOut,
} from "lucide-react";

/**
 * Menu de navigation pour mobile (GSM).
 * Le header est un composant serveur ; ce menu déroulant est client.
 * Affiché uniquement < sm (le header garde les liens texte sur desktop).
 */
export function MobileNav({
  displayName,
  roleLabel,
  isManager,
  isAdmin,
}: {
  displayName: string;
  roleLabel: string;
  isManager: boolean;
  isAdmin: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Ouvrir le menu"
        className="inline-flex size-11 items-center justify-center rounded-md text-foreground outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Menu className="size-6" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-72 p-1.5">
        <div className="px-3 py-2.5">
          <p className="text-base font-semibold text-foreground">{displayName}</p>
          {roleLabel && (
            <p className="text-sm text-muted-foreground">{roleLabel}</p>
          )}
        </div>
        <DropdownMenuSeparator />

        <DropdownMenuItem render={<Link href="/" />} className="gap-3 px-3 py-3 text-base">
          <HardHat className="size-5" /> Mes chantiers
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/entreprises" />} className="gap-3 px-3 py-3 text-base">
          <Building2 className="size-5" /> Entreprises
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/relances" />} className="gap-3 px-3 py-3 text-base">
          <Bell className="size-5" /> Mes relances
        </DropdownMenuItem>
        {isManager && (
          <DropdownMenuItem render={<Link href="/admin" />} className="gap-3 px-3 py-3 text-base">
            {isAdmin ? <Shield className="size-5" /> : <Users className="size-5" />}
            {isAdmin ? "Admin" : "Mon équipe"}
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        {/* Déconnexion : POST form. Plain button (pas un DropdownMenuItem) pour
            garantir la soumission du form sans interception du menu. */}
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-md px-3 py-3 text-base font-medium text-destructive outline-none hover:bg-destructive/10"
          >
            <LogOut className="size-5" /> Déconnexion
          </button>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
