export function computeTargetDimensions(
  srcWidth: number,
  srcHeight: number,
  maxSize: number
): { width: number; height: number } {
  if (srcWidth <= maxSize && srcHeight <= maxSize) {
    return { width: srcWidth, height: srcHeight };
  }

  if (srcWidth >= srcHeight) {
    const scale = maxSize / srcWidth;
    return { width: maxSize, height: Math.round(srcHeight * scale) };
  } else {
    const scale = maxSize / srcHeight;
    return { width: Math.round(srcWidth * scale), height: maxSize };
  }
}

export async function compressImage(
  file: File,
  maxSize = 1600,
  quality = 0.8
): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const { width, height } = computeTargetDimensions(bitmap.width, bitmap.height, maxSize);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D non disponible");
  ctx.drawImage(bitmap, 0, 0, width, height);

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) reject(new Error("Échec de la compression"));
        else resolve(blob);
      },
      "image/jpeg",
      quality
    );
  });
}
