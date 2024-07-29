'use strict';
import { useEffect } from 'react';
import { ReduceMotion } from '../commonTypes';
import {
  ReducedMotionManager,
  isReducedMotionEnabledInSystem,
} from '../ReducedMotion';

/**
 * A component that lets you overwrite default reduce motion behavior globally in your application.
 *
 * @param mode - Determines default reduce motion behavior globally in your application. Configured with {@link ReduceMotion} enum.
 * @see https://docs.swmansion.com/react-native-reanimated/docs/components/ReducedMotionConfig
 */
export function ReducedMotionConfig({ mode }: { mode: ReduceMotion }) {
  useEffect(() => {
    if (!__DEV__) {
      return;
    }
    console.warn(
      `[Reanimated] Reduced motion setting is overwritten with mode '${mode}'.`
    );
  }, []);

  useEffect(() => {
    const wasEnabled = ReducedMotionManager.jsValue;
    switch (mode) {
      case ReduceMotion.System:
        ReducedMotionManager.setEnabled(isReducedMotionEnabledInSystem());
        break;
      case ReduceMotion.Always:
        ReducedMotionManager.setEnabled(true);
        break;
      case ReduceMotion.Never:
        ReducedMotionManager.setEnabled(false);
        break;
    }
    return () => {
      ReducedMotionManager.setEnabled(wasEnabled);
    };
  }, [mode]);

  return null;
}
