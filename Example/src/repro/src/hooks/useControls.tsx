import { useCallback } from 'react';
import {
  Easing,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { useSharedValue } from '../../libt/utils';

export function useControls() {
  const controlsHidden = useSharedValue(false);

  const translateYConfig = {
    duration: 400,
    easing: Easing.bezier(0.33, 0.01, 0, 1),
  };

  const controlsStyles = useAnimatedStyle(() => ({
    opacity: controlsHidden.value ? withTiming(0) : withTiming(1),
    transform: [
      {
        translateY: controlsHidden.value
          ? withTiming(-100, translateYConfig)
          : withTiming(0, translateYConfig),
      },
    ],
    position: 'absolute',
    top: 0,
    width: '100%',
    zIndex: 1,
  }));

  const setControlsHidden = useCallback((hidden: boolean) => {
    'worklet';

    controlsHidden.value = hidden;
  }, []);

  return {
    controlsHidden,
    controlsStyles,
    setControlsHidden,
  };
}
