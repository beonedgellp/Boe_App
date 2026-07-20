import { useRef, useEffect, useCallback } from 'react';

/**
 * Simple spring physics hook for gesture-driven values (drag, swipe, etc.).
 * No external dependencies — uses requestAnimationFrame.
 *
 * @param {number} target - the value to animate toward
 * @param {{ stiffness?: number, damping?: number, mass?: number }} config
 * @returns {{ value: React.MutableRefObject<number>, getValue: () => number }}
 */
export function useSpringValue(target, config: any = {}) {
  const {
    stiffness = 100,
    damping = 10,
    mass = 1,
  } = config;

  const valueRef = useRef(target);
  const velocityRef = useRef(0);
  const rafRef = useRef(null);
  const targetRef = useRef(target);
  const lastTimeRef = useRef(null);

  // Update target without triggering re-render inside the loop
  useEffect(() => {
    targetRef.current = target;
  }, [target]);

  // Expose the current value for consumers that need to read it synchronously
  const getValue = useCallback(() => valueRef.current, []);

  useEffect(() => {
    const step = (time) => {
      if (lastTimeRef.current === null) {
        lastTimeRef.current = time;
      }
      const delta = Math.min((time - lastTimeRef.current) / 1000, 0.05);
      lastTimeRef.current = time;

      const displacement = targetRef.current - valueRef.current;
      const springForce = stiffness * displacement;
      const dampingForce = damping * velocityRef.current;
      const acceleration = (springForce - dampingForce) / mass;

      velocityRef.current += acceleration * delta;
      valueRef.current += velocityRef.current * delta;

      // Stop when settled
      if (
        Math.abs(targetRef.current - valueRef.current) < 0.01 &&
        Math.abs(velocityRef.current) < 0.01
      ) {
        valueRef.current = targetRef.current;
        velocityRef.current = 0;
        lastTimeRef.current = null;
        return;
      }

      rafRef.current = requestAnimationFrame(step);
    };

    lastTimeRef.current = null;
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [stiffness, damping, mass]);

  return { value: valueRef, getValue };
}
