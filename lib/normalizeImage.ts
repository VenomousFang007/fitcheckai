export async function normalizeImage(file: File): Promise<File> {
  // Force browser decode (handles HEIC on iOS Safari)
  const bitmap = await createImageBitmap(file);

  const MAX_WIDTH = 1024;
  const scale = Math.min(1, MAX_WIDTH / bitmap.width);

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');

  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

  const blob: Blob = await new Promise((resolve) => {
    canvas.toBlob(
      (b) => resolve(b as Blob),
      'image/jpeg',
      0.7 // compression
    );
  });

  return new File([blob], 'upload.jpg', { type: 'image/jpeg' });
}