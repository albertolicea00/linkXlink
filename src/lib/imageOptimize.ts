/**
 * Client-side photo optimization before upload: downscale to a web-friendly
 * size and re-encode as WebP (JPEG fallback where the browser can't encode
 * WebP, e.g. Safari). Keeps the original when it's already smaller than the
 * optimized result.
 */
const MAX_DIMENSION = 1280
const WEBP_QUALITY = 0.82
const JPEG_QUALITY = 0.85

function encodeCanvas(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality))
}

export async function optimizeImage(file: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()

    let blob = await encodeCanvas(canvas, 'image/webp', WEBP_QUALITY)
    // Browsers without WebP encoding silently return PNG — fall back to JPEG.
    if (!blob || blob.type !== 'image/webp') {
      blob = await encodeCanvas(canvas, 'image/jpeg', JPEG_QUALITY)
    }
    if (!blob || blob.size >= file.size) return file

    const ext = blob.type === 'image/webp' ? 'webp' : 'jpg'
    const base = file.name.replace(/\.[^.]+$/, '')
    return new File([blob], `${base}.${ext}`, { type: blob.type })
  } catch {
    // Decoding failed (unsupported format) — upload the original untouched.
    return file
  }
}
