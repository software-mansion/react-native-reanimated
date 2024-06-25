'use strict';
import { useEffect } from 'react';
import { ReduceMotion } from '../commonTypes';
import { IS_REDUCED_MOTION } from '../hook/useReducedMotion';

/**
 * A component that lets you overwrite default reduce motion behavior globally in your application.
 *
 * @param mode - Determines default reduce motion behavior globally in your application. Configured with {@link ReduceMotion} enum.
 * @see https://docs.swmansion.com/react-native-reanimated/docs/components/ReduceMotionConfig
 */
export function ReduceMotionConfig({ mode }: { mode: ReduceMotion }) {
  useEffect(() => {
    console.warn(
      `[Reanimated] Reduced motion setting is overwritten with mode '${mode}'.`
    );
  }, []);

  useEffect(() => {
    const wasEnabled = IS_REDUCED_MOTION.value;
    if (mode === ReduceMotion.Never) {
      IS_REDUCED_MOTION.value = false;
    }
    return () => {
      IS_REDUCED_MOTION.value = wasEnabled;
    };
  }, [mode]);

  return null;
}
