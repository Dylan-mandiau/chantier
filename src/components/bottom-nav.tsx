"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HardHat, Building2, Bell, Users, Shield, Plus } from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * Barre de navigation mobile (en bas), façon application native.
 * Affichée < sm uniquement. Bouton "Scanner" central (jaune) = action clé.
 */
export function BottomNav({
  isManager,
  isAdmin,
}: {
  isManager: boolean;
  isAdmin: boolean;
}) {
  const pathname = usePathname();
  const active = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const Item = ({
    href,
    icon: Icon,
    label,
  }: {
    href: string;
    icon: LucideIcon;
    label: string;
  }) => (
    <Link
      href={href}
      className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] ${
        active(href) ? "font-semibold text-foreground" : "text-muted-foreground"
      }`}
    >
      <Icon className="size-5" />
      {label}
    </Link>
  );

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t bg-background/95 backdrop-blur sm:hidden">
      <div className="mx-auto flex max-w-md items-stretch">
        <Item href="/" icon={HardHat} label="Chantiers" />
        <Item href="/entreprises" icon={Building2} label="Entreprises" />

        {/* Scanner — action centrale (FAB jaune) */}
        <Link
          href="/nouveau"
          aria-label="Nouveau chantier"
          className="flex flex-1 flex-col items-center justify-end pb-1.5"
        >
          <span className="-mt-6 grid size-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg ring-4 ring-background">
            <Plus className="size-7" />
          </span>
          <span className="mt-0.5 text-[11px] text-muted-foreground">Scanner</span>
        </Link>

        <Item href="/relances" icon={Bell} label="Relances" />
        {isManager ? (
          <Item
            href="/admin"
            icon={isAdmin ? Shield : Users}
            label={isAdmin ? "Admin" : "Équipe"}
          />
        ) : (
          <div className="flex-1" />
        )}
      </div>
    </nav>
  );
}
