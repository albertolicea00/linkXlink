import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import appConfig from '../config/app-config.json'
import type { Profile } from '../types'

const THRESHOLD_PX = appConfig.swipe_threshold_px
const PRELOAD_AHEAD = appConfig.preload_profiles_ahead
const EXIT_MS = 260

export type SwipeDirection = 'left' | 'right'

/**
 * Optional payload passed from an in-card action button through `swipe()` to
 * `onSwipe`. A plain drag/arrow-key swipe carries NO meta — the moderator deck
 * uses that to treat every gesture as "skip" while the explicit Approve/Deny
 * buttons attach an action. The end-user feed ignores meta entirely.
 */
export interface SwipeMeta {
  action?: 'approve' | 'deny'
  reason?: string
}

interface Props {
  profiles: Profile[]
  /** `swipe` triggers the fly-out animation — use it for in-card action buttons. */
  renderCard: (
    profile: Profile,
    swipe: (dir: SwipeDirection, meta?: SwipeMeta) => void,
  ) => ReactNode
  onSwipe: (profile: Profile, direction: SwipeDirection, meta?: SwipeMeta) => void
  /** Fired when a new card becomes the top of the deck (view tracking). */
  onTopChange?: (profile: Profile) => void
  swipeDisabled?: boolean
  /** Tinder-style stamps shown while dragging (e.g. SKIP / APPROVE). */
  overlayLabels?: { left: string; right: string }
  emptyState?: ReactNode
  showCounter?: boolean
  /** "I changed my mind" link that brings the previous card back. */
  showUndo?: boolean
  /** Hint text shown above the deck (e.g. "Swipe to next"). Hidden in empty state. */
  hint?: ReactNode
}

export function SwipeDeck({
  profiles,
  renderCard,
  onSwipe,
  onTopChange,
  swipeDisabled = false,
  overlayLabels,
  emptyState = null,
  showCounter = false,
  showUndo = false,
  hint,
}: Props) {
  const { t } = useTranslation()
  const [index, setIndex] = useState(0)
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null)
  const [leaving, setLeaving] = useState<SwipeDirection | null>(null)
  const pointerStart = useRef<{ x: number; y: number } | null>(null)
  const onTopChangeRef = useRef(onTopChange)
  onTopChangeRef.current = onTopChange

  const profile = profiles[index] as Profile | undefined

  // New list → start over (also prevents stale index after a refetch).
  useEffect(() => {
    setIndex(0)
    setDrag(null)
    setLeaving(null)
  }, [profiles])

  // View tracking: exactly once per card reaching the top.
  useEffect(() => {
    if (profile) onTopChangeRef.current?.(profile)
  }, [profile?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Preload photos of the next N profiles so the next cards render instantly.
  useEffect(() => {
    for (const p of profiles.slice(index + 1, index + 1 + PRELOAD_AHEAD)) {
      for (const url of p.photos ?? []) {
        const img = new Image()
        img.src = url
      }
    }
  }, [index, profiles])

  const swipe = (dir: SwipeDirection, meta?: SwipeMeta) => {
    if (!profile || leaving || swipeDisabled) return
    setLeaving(dir)
    onSwipe(profile, dir, meta)
    window.setTimeout(() => {
      setLeaving(null)
      setDrag(null)
      setIndex((i) => i + 1)
    }, EXIT_MS)
  }

  const handlePointerDown = (e: React.PointerEvent) => {
    if (leaving || swipeDisabled) return
    // Taps on buttons/links inside the card are clicks, not drags.
    if ((e.target as HTMLElement).closest('a, button')) return
    pointerStart.current = { x: e.clientX, y: e.clientY }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!pointerStart.current || leaving) return
    setDrag({ x: e.clientX - pointerStart.current.x, y: e.clientY - pointerStart.current.y })
  }

  const handlePointerEnd = () => {
    if (!pointerStart.current) return
    const x = drag?.x ?? 0
    pointerStart.current = null
    if (Math.abs(x) >= THRESHOLD_PX) swipe(x > 0 ? 'right' : 'left')
    else setDrag(null)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') swipe('left')
    if (e.key === 'ArrowRight') swipe('right')
  }

  const undo = () => {
    if (leaving || index === 0) return
    setDrag(null)
    setIndex((i) => i - 1)
  }

  if (!profile) return <div className="swipe-deck swipe-deck--empty">{emptyState}</div>

  const x = leaving ? (leaving === 'right' ? 1 : -1) * (window.innerWidth + 200) : (drag?.x ?? 0)
  const y = leaving ? 0 : (drag?.y ?? 0) * 0.25
  const topStyle = {
    transform: `translate(${x}px, ${y}px) rotate(${x / 22}deg)`,
    transition: leaving
      ? `transform ${EXIT_MS}ms ease-in`
      : drag
        ? 'none'
        : 'transform 0.2s ease',
  }
  const dragRatio = Math.max(-1, Math.min(1, x / (THRESHOLD_PX * 1.5)))
  // Behind-the-top cards visible in the stack (visual preload).
  const behind = profiles.slice(index + 1, index + 3)

  return (
    <div className="swipe-deck">
      {hint && <div className="swipe-deck__hint-wrap">{hint}</div>}
      <div
        className="swipe-deck__stack"
        role="group"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        aria-label={showCounter ? t('feed.counter', { current: index + 1, total: profiles.length }) : undefined}
      >
        {behind
          .map((p, i) => (
            <div
              key={p.id}
              className="swipe-deck__card swipe-deck__card--behind"
              style={{
                transform: `translateY(${(i + 1) * 10}px) scale(${1 - (i + 1) * 0.04})`,
                zIndex: behind.length - i,
              }}
              aria-hidden
            >
              {renderCard(p, swipe)}
            </div>
          ))
          .reverse()}
        <div
          // Keyed by profile: each card gets a fresh DOM node, so the next
          // card never inherits the flown-out transform (snap-back glitch).
          key={profile.id}
          className="swipe-deck__card swipe-deck__card--top"
          style={{ ...topStyle, zIndex: behind.length + 1 }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
        >
          {renderCard(profile, swipe)}
          {overlayLabels && (
            <>
              <span
                className="swipe-deck__stamp swipe-deck__stamp--left"
                style={{ opacity: Math.max(0, -dragRatio) }}
              >
                {overlayLabels.left}
              </span>
              <span
                className="swipe-deck__stamp swipe-deck__stamp--right"
                style={{ opacity: Math.max(0, dragRatio) }}
              >
                {overlayLabels.right}
              </span>
            </>
          )}
        </div>
      </div>

      {showUndo && index > 0 && !leaving && (
        <button type="button" className="swipe-deck__undo" onClick={undo}>
          {t('feed.undo')}
        </button>
      )}

      {showCounter && (
        <p className="swipe-deck__counter">
          {t('feed.counter', { current: index + 1, total: profiles.length })}
        </p>
      )}
    </div>
  )
}
