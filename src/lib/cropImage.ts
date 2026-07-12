export interface PixelCrop {
  x: number
  y: number
  width: number
  height: number
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

/**
 * Crop the region the user selected in the cropper (pixel coordinates in the
 * source image) into a new File. Output is left unscaled/unencoded here —
 * `optimizeImage` handles downscaling + WebP/JPEG afterwards.
 */
export async function getCroppedFile(
  src: string,
  crop: PixelCrop,
  fileName: string,
): Promise<File | null> {
  const img = await loadImage(src)
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(crop.width)
  canvas.height = Math.round(crop.height)
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.drawImage(
    img,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    canvas.width,
    canvas.height,
  )
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/png'),
  )
  if (!blob) return null
  const base = fileName.replace(/\.[^.]+$/, '')
  return new File([blob], `${base}.png`, { type: 'image/png' })
}
