"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Camera, ImageIcon } from "lucide-react";

interface Props {
  onFileSelected: (file: File) => void;
  disabled?: boolean;
}

export function CameraCapture({ onFileSelected, disabled }: Props) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Le fichier doit être une image");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setError("L'image fait plus de 20 Mo");
      return;
    }
    onFileSelected(file);
  }

  return (
    <div className="space-y-4">
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleChange}
        className="hidden"
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        onChange={handleChange}
        className="hidden"
      />

      <Button
        size="lg"
        type="button"
        className="w-full h-32 text-lg flex-col gap-2"
        onClick={() => cameraInputRef.current?.click()}
        disabled={disabled}
      >
        <Camera className="size-10" />
        Prendre une photo
      </Button>

      <Button
        size="lg"
        variant="secondary"
        type="button"
        className="w-full h-32 text-lg flex-col gap-2"
        onClick={() => galleryInputRef.current?.click()}
        disabled={disabled}
      >
        <ImageIcon className="size-10" />
        Choisir dans la galerie
      </Button>

      {error && <p className="text-sm text-destructive text-center">{error}</p>}
    </div>
  );
}
