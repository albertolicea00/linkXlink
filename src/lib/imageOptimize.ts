/**
 * Client-side photo optimization before upload: center-crop to the deck's
 * fixed portrait aspect ratio, downscale to a web-friendly size, and re-encode
 * as WebP (JPEG fallback where the browser can't encode WebP, e.g. Safari).
 *
 * Cropping to a fixed ratio keeps every card the same size in the UI — the
 * `.photo-carousel` container is `aspect-ratio: 4 / 5`, so storing 4:5 avoids
 * relying on `object-fit: cover` to hide mismatched source dimensions.
 */
const MAX_DIMENSION = 1280
const WEBP_QUALITY = 0.82
const JPEG_QUALITY = 0.85
/** Portrait target, matches `.photo-carousel { aspect-ratio: 4 / 5 }`. */
export const PHOTO_ASPECT = { w: 4, h: 5 }

function encodeCanvas(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality))
}

export async function optimizeImage(file: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file)

    // Center-crop the source down to the target aspect ratio.
    const target = PHOTO_ASPECT.w / PHOTO_ASPECT.h
    const srcRatio = bitmap.width / bitmap.height
    let cropW = bitmap.width
    let cropH = bitmap.height
    if (srcRatio > target) {
      cropW = Math.round(bitmap.height * target) // too wide → trim sides
    } else {
      cropH = Math.round(bitmap.width / target) // too tall → trim top/bottom
    }
    const sx = Math.round((bitmap.width - cropW) / 2)
    const sy = Math.round((bitmap.height - cropH) / 2)

    // Scale the crop down to fit within MAX_DIMENSION on its longest side.
    const scale = Math.min(1, MAX_DIMENSION / Math.max(cropW, cropH))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(cropW * scale)
    canvas.height = Math.round(cropH * scale)
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(bitmap, sx, sy, cropW, cropH, 0, 0, canvas.width, canvas.height)
    bitmap.close()

    let blob = await encodeCanvas(canvas, 'image/webp', WEBP_QUALITY)
    // Browsers without WebP encoding silently return PNG — fall back to JPEG.
    if (!blob || blob.type !== 'image/webp') {
      blob = await encodeCanvas(canvas, 'image/jpeg', JPEG_QUALITY)
    }
    // Cropping changes the framing, so keep the result even if it isn't smaller
    // than the original — the fixed ratio is the point, not just byte savings.
    if (!blob) return file

    const ext = blob.type === 'image/webp' ? 'webp' : 'jpg'
    const base = file.name.replace(/\.[^.]+$/, '')
    return new File([blob], `${base}.${ext}`, { type: blob.type })
  } catch {
    // Decoding failed (unsupported format) — upload the original untouched.
    return file
  }
}
