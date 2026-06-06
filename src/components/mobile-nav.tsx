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
        className="inline-flex size-9 items-center justify-center rounded-md text-foreground outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Menu className="size-5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={6} className="w-56">
        <div className="px-2 py-1.5">
          <p className="text-sm font-semibold text-foreground">{displayName}</p>
          {roleLabel && (
            <p className="text-xs text-muted-foreground">{roleLabel}</p>
          )}
        </div>
        <DropdownMenuSeparator />

        <DropdownMenuItem render={<Link href="/" />}>
          <HardHat /> Mes chantiers
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/entreprises" />}>
          <Building2 /> Entreprises
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/relances" />}>
          <Bell /> Mes relances
        </DropdownMenuItem>
        {isManager && (
          <DropdownMenuItem render={<Link href="/admin" />}>
            {isAdmin ? <Shield /> : <Users />}
            {isAdmin ? "Admin" : "Mon équipe"}
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        {/* Déconnexion : POST form. Plain button (pas un DropdownMenuItem) pour
            garantir la soumission du form sans interception du menu. */}
        <form action="/auth/signout" method="post" className="p-1">
          <button
            type="submit"
            className="flex w-full items-center gap-1.5 rounded-md px-1.5 py-1 text-sm text-destructive outline-none hover:bg-destructive/10"
          >
            <LogOut className="size-4" /> Déconnexion
          </button>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
