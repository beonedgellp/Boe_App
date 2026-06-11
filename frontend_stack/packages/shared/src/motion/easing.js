/**
 * Named easing curves that match the CSS custom properties in tokens-core.css.
 * Use these in JS animations (GSAP, WAAPI, manual rAF) to stay consistent with CSS transitions.
 */

export const EASE = 'cubic-bezier(0.2, 0, 0, 1)';
export const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)';
export const EASE_IN_OUT = 'cubic-bezier(0.77, 0, 0.175, 1)';
export const EASE_DRAWER = 'cubic-bezier(0.32, 0.72, 0, 1)';

/** GSAP-friendly ease strings */
export const GSAP_EASE_OUT = 'power3.out';
export const GSAP_EASE_IN_OUT = 'power2.inOut';
export const GSAP_EASE_DRAWER = 'power2.out';

/** Spring configuration for gesture-driven animations (Apple-style).
 *  Pass to Framer Motion or manual spring solvers.
 */
export const SPRING_GENTLE = { type: 'spring', duration: 0.5, bounce: 0.2 };
export const SPRING_SNAP = { type: 'spring', duration: 0.35, bounce: 0.1 };

/** Traditional physics spring for custom solvers */
export const SPRING_PHYSICS = { mass: 1, stiffness: 100, damping: 10 };
