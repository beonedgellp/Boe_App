import { useEffect, useState } from 'react';

/**
 * Detects prefers-reduced-motion and returns a boolean.
 * Also returns a `motionProps` helper that strips transform/animation
 * props when reduced motion is preferred, falling back to opacity crossfades.
 */
export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mql.matches);

    const handler = (e) => setReduced(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  return reduced;
}

/**
 * Returns style props for an element based on reduced-motion preference.
 * When reduced motion is on, skips transform/position animations and uses
 * opacity-only crossfades. When off, returns the animated style.
 */
export function getMotionStyle(reduced, animatedStyle, fallbackStyle: any = {}) {
  if (reduced) {
    // Keep opacity transitions but strip transforms
    const { opacity, ...rest } = animatedStyle;
    return { ...fallbackStyle, ...(opacity !== undefined && { opacity }) };
  }
  return animatedStyle;
}
