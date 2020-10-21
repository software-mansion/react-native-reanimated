import {
  runOnUI,
  withTiming,
  withSpring,
  Easing,
  withDecay,
  interpolate,
} from 'react-native-reanimated';
import { useRef } from 'react';
import { useAnimatedGestureHandler } from './useAnimatedGestureHandler';
import * as vec from './vectors';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const { useSharedVector, ...usedVectors } = vec;

function useRunOnce(cb: () => void) {
  const ref = useRef<boolean | null>(null);

  if (ref.current === null) {
    cb();
    ref.current = true;
  }
}

const usedWorklets = {
  withTiming,
  withSpring,
  bezier: Easing.bezier,
  interpolate,
  withDecay,
  useAnimatedGestureHandler,
  ...usedVectors,
} as { [key: string]: any };

export function useInit() {
  useRunOnce(
    runOnUI(() => {
      'worklet';

      const x: { [key: string]: any } = {};
      Object.keys(usedWorklets).forEach((key) => {
        x[key] = usedWorklets[key];
      });
    }),
  );
}
