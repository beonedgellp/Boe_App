import React, { useRef, useState, useEffect } from 'react';
import { useReducedMotion } from './useReducedMotion.js';

/**
 * FadeIn — scroll-triggered reveal component.
 *
 * Uses IntersectionObserver to detect when the element enters the viewport,
 * then applies a CSS transition for transform + opacity entrance.
 * Respects prefers-reduced-motion (falls back to instant opacity).
 *
 * Props:
 *   - children
 *   - direction: 'up' | 'down' | 'left' | 'right' | 'none' (default 'up')
 *   - distance: number (px, default 16)
 *   - duration: number (ms, default 400)
 *   - delay: number (ms, default 0)
 *   - threshold: number (0–1, default 0.15)
 *   - once: boolean (default true)
 *   - as: string (wrapper element, default 'div')
 *   - className: string
 *   - style: object
 */
export default function FadeIn({
  children,
  direction = 'up',
  distance = 16,
  duration = 400,
  delay = 0,
  threshold = 0.15,
  once = true,
  as: Tag = 'div',
  className = '',
  style = {},
  ...rest
}) {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (once) observer.unobserve(el);
        } else if (!once) {
          setIsVisible(false);
        }
      },
      { threshold }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, once]);

  const getTransform = () => {
    if (reduced || direction === 'none') return 'none';
    switch (direction) {
      case 'up':    return `translateY(${distance}px)`;
      case 'down':  return `translateY(-${distance}px)`;
      case 'left':  return `translateX(${distance}px)`;
      case 'right': return `translateX(-${distance}px)`;
      default:      return 'none';
    }
  };

  const computedStyle = {
    opacity: isVisible ? 1 : (reduced ? 1 : 0),
    transform: isVisible ? 'none' : getTransform(),
    transition: reduced
      ? `opacity ${duration}ms ease`
      : `opacity ${duration}ms cubic-bezier(0.23, 1, 0.32, 1), transform ${duration}ms cubic-bezier(0.23, 1, 0.32, 1)`,
    transitionDelay: `${delay}ms`,
    willChange: 'opacity, transform',
    ...style,
  };

  return (
    <Tag
      ref={ref}
      className={className}
      style={computedStyle}
      {...rest}
    >
      {children}
    </Tag>
  );
}
