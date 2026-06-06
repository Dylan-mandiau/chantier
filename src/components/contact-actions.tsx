"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Phone, Mail } from "lucide-react";

/**
 * Boutons Appeler / Email avec CONFIRMATION pour éviter les déclenchements
 * accidentels (erreurs de "tapotage" sur mobile) : un tap ouvre une boîte de
 * confirmation, et seule la validation lance réellement l'appel / le mail.
 */
export function ContactActions({
  telephone,
  email,
  nom,
}: {
  telephone: string | null;
  email: string | null;
  nom: string;
}) {
  const [confirm, setConfirm] = useState<{
    type: "tel" | "mail";
    value: string;
  } | null>(null);

  if (!telephone && !email) return null;

  function launch() {
    if (!confirm) return;
    const href = (confirm.type === "tel" ? "tel:" : "mailto:") + confirm.value;
    window.location.href = href;
    setConfirm(null);
  }

  return (
    <>
      <div className="space-y-1.5">
        {telephone && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">📞 {telephone}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirm({ type: "tel", value: telephone })}
            >
              <Phone className="size-3.5 mr-1" /> Appeler
            </Button>
          </div>
        )}
        {email && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm break-all">✉️ {email}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirm({ type: "mail", value: email })}
            >
              <Mail className="size-3.5 mr-1" /> Email
            </Button>
          </div>
        )}
      </div>

      {confirm && (
        <Dialog open onOpenChange={(o) => !o && setConfirm(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>
                {confirm.type === "tel" ? "📞 Appeler" : "📧 Écrire à"} {nom} ?
              </DialogTitle>
              <DialogDescription className="break-all text-base font-medium text-foreground">
                {confirm.value}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setConfirm(null)}>
                Annuler
              </Button>
              <Button onClick={launch}>
                {confirm.type === "tel" ? "Appeler" : "Ouvrir le mail"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
