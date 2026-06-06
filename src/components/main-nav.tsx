"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { HardHat, Building2, Bell, Shield, Users, LogOut, ChevronDown } from "lucide-react";

/**
 * Navigation principale (desktop) : liens avec état actif + menu profil
 * (avatar initiales + prénom au lieu de l'email brut).
 */
export function MainNav({
  displayName,
  roleLabel,
  initials,
  isManager,
  isAdmin,
}: {
  displayName: string;
  roleLabel: string;
  initials: string;
  isManager: boolean;
  isAdmin: boolean;
}) {
  const pathname = usePathname();
  const active = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const itemCls = (href: string) =>
    `inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition ${
      active(href)
        ? "bg-accent text-accent-foreground"
        : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
    }`;

  return (
    <nav className="flex items-center gap-1">
      <Link href="/" className={itemCls("/")}>
        <HardHat className="size-4" /> Chantiers
      </Link>
      <Link href="/entreprises" className={itemCls("/entreprises")}>
        <Building2 className="size-4" /> Entreprises
      </Link>
      <Link href="/relances" className={itemCls("/relances")}>
        <Bell className="size-4" /> Relances
      </Link>
      {isManager && (
        <Link href="/admin" className={itemCls("/admin")}>
          {isAdmin ? <Shield className="size-4" /> : <Users className="size-4" />}
          {isAdmin ? "Admin" : "Mon équipe"}
        </Link>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="Profil"
          className="ml-1 inline-flex items-center gap-2 rounded-full py-1 pl-1 pr-2 outline-none hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="grid size-8 place-items-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
            {initials}
          </span>
          <span className="hidden text-sm font-medium lg:inline">{displayName}</span>
          <ChevronDown className="size-3.5 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={6} className="w-56">
          <div className="px-2 py-1.5">
            <p className="text-sm font-semibold text-foreground">{displayName}</p>
            {roleLabel && (
              <p className="text-xs text-muted-foreground">{roleLabel}</p>
            )}
          </div>
          <DropdownMenuSeparator />
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
    </nav>
  );
}
