import { useEffect } from 'react';
import {
  cancelAnimation,
  Easing,
  ReduceMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

export function useRepeatingProgress(index: number) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, {
        duration: durationFor(index),
        easing: Easing.linear,
        reduceMotion: ReduceMotion.Never,
      }),
      -1,
      true,
      undefined,
      ReduceMotion.Never
    );
    return () => cancelAnimation(progress);
  }, [index, progress]);

  return progress;
}

function durationFor(index: number) {
  return 800 + (index % 8) * 100;
}
