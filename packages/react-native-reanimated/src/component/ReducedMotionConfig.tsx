'use strict';
import { useEffect } from 'react';

import { logger } from '../common';
import type { ReduceMotion } from '../commonTypes';
import { ReducedMotionManager } from '../ReducedMotion';

/**
 * A component that lets you overwrite default reduce motion behavior globally
 * in your application.
 *
 * @param mode - Determines default reduce motion behavior globally in your
 *   application. Configured with {@link ReduceMotion} enum.
 * @see https://docs.swmansion.com/react-native-reanimated/docs/device/ReducedMotionConfig
 */
export function ReducedMotionConfig({ mode }: { mode: ReduceMotion }) {
  useEffect(() => {
    if (!__DEV__) {
      return;
    }
    logger.warn(`Reduced motion setting is overwritten with mode '${mode}'.`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => ReducedMotionManager.override(mode), [mode]);

  return null;
}
