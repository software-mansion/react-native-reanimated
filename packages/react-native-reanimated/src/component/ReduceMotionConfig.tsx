'use strict';
import { useEffect } from 'react';
import { ReduceMotion } from '../commonTypes';
import { IsReduceMotion } from '../hook/useReducedMotion';
import { isReducedMotion } from '../PlatformChecker';

/**
 * A component that lets you overwrite default reduce motion behavior globally in your application.
 *
 * @param mode - Determines default reduce motion behavior globally in your application. Configured with {@link ReduceMotion} enum.
 * @see https://docs.swmansion.com/react-native-reanimated/docs/components/ReduceMotionConfig
 */
export function ReduceMotionConfig({ mode }: { mode: ReduceMotion }) {
  useEffect(() => {
    if (!__DEV__) {
      return;
    }
    console.warn(
      `[Reanimated] Reduced motion setting is overwritten with mode '${mode}'.`
    );
  }, []);

  useEffect(() => {
    const wasEnabled = IsReduceMotion.jsValue;
    switch (mode) {
      case ReduceMotion.System:
        const isReducedMotionEnabledBySystem = isReducedMotion();
        IsReduceMotion.setEnabled(isReducedMotionEnabledBySystem);
        break;
      case ReduceMotion.Always:
        IsReduceMotion.setEnabled(true);
        break;
      case ReduceMotion.Never:
        IsReduceMotion.setEnabled(false);
        break;
    }
    return () => {
      IsReduceMotion.setEnabled(wasEnabled);
    };
  }, [mode]);

  return null;
}
