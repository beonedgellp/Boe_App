import { useRef, useEffect, useCallback } from 'react';

/**
 * Simple spring physics hook for gesture-driven values (drag, swipe, etc.).
 * No external dependencies — uses requestAnimationFrame.
 *
 * @param {number} target - the value to animate toward
 * @param {{ stiffness?: number, damping?: number, mass?: number }} config
 * @returns {number} current animated value
 */
export function useSpringValue(target, config = {}) {
  const {
    stiffness = 100,
    damping = 10,
    mass = 1,
  } = config;

  const valueRef = useRef(target);
  const velocityRef = useRef(0);
  const rafRef = useRef(null);
  const targetRef = useRef(target);

  // Update target without triggering re-render inside the loop
  useEffect(() => {
    targetRef.current = target;
  }, [target]);

  // Expose the current value for consumers that need to read it synchronously
  const getValue = useCallback(() => valueRef.current, []);

  useEffect(() => {
    const step = () => {
      const displacement = targetRef.current - valueRef.current;
      const springForce = stiffness * displacement;
      const dampingForce = damping * velocityRef.current;
      const acceleration = (springForce - dampingForce) / mass;

      velocityRef.current += acceleration * (1 / 60);
      valueRef.current += velocityRef.current * (1 / 60);

      // Stop when settled
      if (
        Math.abs(targetRef.current - valueRef.current) < 0.01 &&
        Math.abs(velocityRef.current) < 0.01
      ) {
        valueRef.current = targetRef.current;
        velocityRef.current = 0;
        return;
      }

      rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [stiffness, damping, mass]);

  return { value: valueRef, getValue };
}
