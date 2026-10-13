'use strict';
import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react';

import type { AnimatedHinge } from '../commonTypes';
import { getHingeSensor } from '../core';

const NOOP = () => {
  // NOOP
};

const getServerHingeAvailability = () => false;

/**
 * Lets you create animations based on the hinge of a foldable device.
 *
 * @returns An object containing the hinge angle and status [shared
 *   value](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#shared-value),
 *   the hinge availability and a function to stop the hinge updates.
 * @see https://docs.swmansion.com/react-native-reanimated/docs/device/useAnimatedHinge
 */
export function useAnimatedHinge(): AnimatedHinge {
  const hingeSensor = getHingeSensor();

  const isAvailable = useSyncExternalStore(
    hingeSensor.subscribeToAvailability,
    hingeSensor.isAvailable,
    getServerHingeAvailability
  );

  const unregisterRef = useRef(NOOP);

  useEffect(() => {
    let isRegistered = true;
    hingeSensor.register();

    const unregister = () => {
      if (isRegistered) {
        isRegistered = false;
        hingeSensor.unregister();
      }
    };
    unregisterRef.current = unregister;

    return unregister;
  }, [hingeSensor]);

  return useMemo(
    () => ({
      hinge: hingeSensor.getSharedValue(),
      isAvailable,
      unregister: () => unregisterRef.current(),
    }),
    [hingeSensor, isAvailable]
  );
}
