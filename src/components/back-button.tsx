"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

/**
 * Bouton "Retour" contextuel : revient à l'écran précédent (history.back).
 * Si pas d'historique (ouverture directe), retombe sur `fallback`.
 */
export function BackButton({
  fallback = "/",
  label = "Retour",
}: {
  fallback?: string;
  label?: string;
}) {
  const router = useRouter();

  function go() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push(fallback);
    }
  }

  return (
    <Button variant="ghost" size="sm" onClick={go}>
      <ChevronLeft className="size-4 mr-1" />
      {label}
    </Button>
  );
}
