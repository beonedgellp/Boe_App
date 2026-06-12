import React, { useRef, useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';
import gsap from 'gsap';
import './PageTransition.css';
import { useReducedMotion } from './useReducedMotion.js';

/**
 * PageTransition — wraps route content and animates on location change.
 *
 * Uses GSAP for a fade + slight vertical shift on every route change.
 * Respects prefers-reduced-motion (instant switch).
 *
 * Usage: wrap the <Routes> output or individual route elements.
 */
export default function PageTransition({ children }) {
  const location = useLocation();
  const containerRef = useRef(null);
  const reduced = useReducedMotion();

  useLayoutEffect(() => {
    if (reduced) return;
    const el = containerRef.current;
    if (!el) return;

    gsap.fromTo(
      el,
      { opacity: 0, y: 12 },
      { opacity: 1, y: 0, duration: 0.35, ease: 'power3.out', clearProps: 'transform' }
    );
  }, [location.pathname, reduced]);

  return (
    <div
      ref={containerRef}
      className={`be-page-transition ${reduced ? '' : 'be-page-transition--animated'}`}
    >
      {children}
    </div>
  );
}
