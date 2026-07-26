import { useEffect } from 'react'

/**
 * Reveals `[data-reveal]` elements as they scroll into view (one shot each).
 *
 * The hidden state lives behind a `.reveal-ready` class the hook puts on <html>,
 * so content is never invisible when JS is unavailable or this hook doesn't run.
 * Respects prefers-reduced-motion and degrades to "everything visible" where
 * IntersectionObserver is missing.
 */
export function useScrollReveal() {
  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'))
    if (nodes.length === 0) return

    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduced || !('IntersectionObserver' in window)) {
      for (const node of nodes) node.classList.add('is-revealed')
      return
    }

    document.documentElement.classList.add('reveal-ready')

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          entry.target.classList.add('is-revealed')
          observer.unobserve(entry.target)
        }
      },
      // Slightly inset at the bottom so an element animates once it's properly
      // on screen, not the instant its first pixel appears.
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    )

    for (const node of nodes) observer.observe(node)

    return () => {
      observer.disconnect()
      document.documentElement.classList.remove('reveal-ready')
    }
  }, [])
}
