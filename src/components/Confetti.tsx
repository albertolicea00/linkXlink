import { useEffect } from 'react'

/**
 * Self-contained confetti burst effect — this single file has no project
 * dependencies beyond React, so it can be copied into any React project as-is.
 *
 * Usage:
 *   1. Mount <ConfettiRoot /> ONCE, near the app root (it's `position: fixed`,
 *      so it doesn't matter where in the tree — just don't mount it twice).
 *   2. Call fireConfetti() from any success handler: profile approved, first
 *      WhatsApp click, account created, a moderator's first approval, etc.
 *
 * Pieces are plain DOM nodes appended directly to the root container and
 * removed after their animation ends — deliberately NOT React state, since a
 * fire-and-forget burst of dozens of short-lived elements is pure visual
 * noise with no interactivity; churning them through React re-renders would
 * only add overhead for no benefit.
 */

const CONTAINER_ID = 'confetti-root-container'

export interface ConfettiOptions {
  corners?: Array<'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'>
  /** Seconds each piece takes to fly out and fade. */
  duration?: number
  /** Pieces per burst. */
  count?: number
  /** Max travel distance in pixels. */
  spread?: number
  /** Piece side length in pixels. */
  size?: number
  /** How many bursts to fire in sequence. */
  bursts?: number
  /** Milliseconds between bursts (only matters when bursts > 1). */
  burstDelay?: number
  /** Bursts fired per batch before waiting burstDelay (rarely needs changing). */
  batchSize?: number
}

/**
 * Fires a confetti burst. No-op if <ConfettiRoot /> isn't mounted yet — never
 * throws, so it's always safe to call from a success handler.
 */
export function fireConfetti(options: ConfettiOptions = {}): void {
  const container = document.getElementById(CONTAINER_ID)
  if (!container) return

  const {
    corners = ['bottom-left', 'bottom-right'],
    duration = 1.2,
    count = 80,
    spread = 600,
    size = 8,
    bursts = 3,
    burstDelay = 80,
    batchSize = 1,
  } = options

  const w = document.documentElement.clientWidth
  const h = document.documentElement.clientHeight
  const cornerMap = {
    'top-left': { x: 0, y: 0 },
    'top-right': { x: w, y: 0 },
    'bottom-left': { x: 0, y: h },
    'bottom-right': { x: w, y: h },
  }

  const singleBurst = () => {
    for (let i = 0; i < count; i++) {
      const piece = document.createElement('div')
      piece.className = 'confetti-piece'

      const corner = cornerMap[corners[Math.floor(Math.random() * corners.length)]]
      piece.style.left = `${corner.x}px`
      piece.style.top = `${corner.y}px`

      const dx = (Math.random() - 0.5) * spread
      const dy = (Math.random() - 1) * spread

      piece.style.width = `${size}px`
      piece.style.height = `${size}px`
      piece.style.setProperty('--dx', `${dx}px`)
      piece.style.setProperty('--dy', `${dy}px`)
      piece.style.setProperty('--hue', String(Math.floor(Math.random() * 360)))
      piece.style.setProperty('--duration', `${duration}s`)

      container.appendChild(piece)
      setTimeout(() => piece.remove(), duration * 1000)
    }
  }

  let executed = 0
  const runBatch = () => {
    for (let i = 0; i < batchSize && executed < bursts; i++) {
      singleBurst()
      executed++
    }
    if (executed < bursts) setTimeout(runBatch, burstDelay)
  }
  runBatch()
}

/** Mount once near the app root. Renders its own styles — nothing else to import. */
export function ConfettiRoot() {
  useEffect(() => {
    if (document.querySelectorAll(`#${CONTAINER_ID}`).length > 1) {
      // eslint-disable-next-line no-console
      console.warn('<ConfettiRoot /> mounted more than once — only mount it one time.')
    }
  }, [])

  return (
    <>
      <style>{`
        #${CONTAINER_ID} {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 9999;
          overflow: hidden;
        }
        .confetti-piece {
          position: absolute;
          background: hsl(var(--hue), 100%, 50%);
          opacity: 0;
          transform: translate(0, 0) rotate(0deg);
          animation: confetti-pop var(--duration) ease-out forwards;
        }
        @keyframes confetti-pop {
          0% { opacity: 1; transform: translate(0, 0) rotate(0deg); }
          100% { opacity: 0; transform: translate(var(--dx), var(--dy)) rotate(720deg); }
        }
      `}</style>
      <div id={CONTAINER_ID} />
    </>
  )
}
