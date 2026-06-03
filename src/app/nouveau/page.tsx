"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { compressImage } from "@/lib/image/compress";
import { CameraCapture } from "@/components/camera-capture";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function NouveauChantierPage() {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<string>("");

  async function handleFile(file: File) {
    setUploading(true);
    try {
      setProgress("Compression de l'image…");
      const compressed = await compressImage(file, 1600, 0.85);

      setProgress("Téléchargement…");
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const filename = `${user.id}/${Date.now()}.jpg`;
      const { error: upErr } = await supabase.storage
        .from("chantier-photos")
        .upload(filename, compressed, {
          contentType: "image/jpeg",
          upsert: false,
        });
      if (upErr) throw upErr;

      let lat: number | null = null;
      let lng: number | null = null;
      try {
        const pos = await new Promise<GeolocationPosition>((res, rej) =>
          navigator.geolocation.getCurrentPosition(res, rej, {
            timeout: 5000,
            enableHighAccuracy: false,
          })
        );
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } catch {
        // ignore : géoloc refusée ou indisponible
      }

      const params = new URLSearchParams({
        photo: filename,
        ...(lat !== null ? { lat: String(lat) } : {}),
        ...(lng !== null ? { lng: String(lng) } : {}),
      });
      router.push(`/analyse/new?${params.toString()}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erreur inconnue";
      toast.error(msg);
      setUploading(false);
    }
  }

  return (
    <main className="container max-w-md mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Nouveau chantier</CardTitle>
          <p className="text-sm text-muted-foreground">
            Choisis la photo du panneau de chantier
          </p>
        </CardHeader>
        <CardContent>
          {uploading ? (
            <div className="text-center py-12">
              <p className="text-lg font-medium animate-pulse">{progress}</p>
            </div>
          ) : (
            <CameraCapture onFileSelected={handleFile} />
          )}
        </CardContent>
      </Card>
    </main>
  );
}
