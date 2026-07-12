import { useCallback, useEffect, useState } from 'react'
import Cropper, { type Area } from 'react-easy-crop'
import { useTranslation } from 'react-i18next'
import { PHOTO_ASPECT } from '../lib/imageOptimize'
import { getCroppedFile } from '../lib/cropImage'

interface Props {
  file: File
  onCancel: () => void
  onCropped: (file: File) => void
}

/**
 * Interactive crop to the fixed deck aspect ratio (drag to reposition, slider
 * to zoom). Produces a cropped File that the caller then optimizes + uploads.
 */
export function CropModal({ file, onCancel, onCropped }: Props) {
  const { t } = useTranslation()
  const [src, setSrc] = useState('')
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [area, setArea] = useState<Area | null>(null)
  const [busy, setBusy] = useState(false)

  // Object URL for the picked file; revoked on unmount to avoid a leak.
  useEffect(() => {
    const url = URL.createObjectURL(file)
    setSrc(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const onCropComplete = useCallback((_: Area, pixels: Area) => setArea(pixels), [])

  const confirm = async () => {
    if (!area) return
    setBusy(true)
    const cropped = await getCroppedFile(src, area, file.name)
    setBusy(false)
    onCropped(cropped ?? file)
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" onClick={onCancel}>
      <div className="modal crop-modal" onClick={(e) => e.stopPropagation()}>
        <div className="crop-modal__stage">
          {src && (
            <Cropper
              image={src}
              crop={crop}
              zoom={zoom}
              aspect={PHOTO_ASPECT.w / PHOTO_ASPECT.h}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          )}
        </div>
        <input
          className="crop-modal__zoom"
          type="range"
          min={1}
          max={3}
          step={0.01}
          value={zoom}
          aria-label={t('crop.zoom')}
          onChange={(e) => setZoom(Number(e.target.value))}
        />
        <div className="modal__actions">
          <button type="button" className="btn" onClick={onCancel} disabled={busy}>
            {t('account.cancel')}
          </button>
          <button type="button" className="btn btn--primary" onClick={confirm} disabled={busy}>
            {busy ? t('register.submitting') : t('crop.confirm')}
          </button>
        </div>
      </div>
    </div>
  )
}
