import { Dimensions } from 'react-native';
import {
  // @ts-ignore
  useMapper,
  useSharedValue as REAuseSharedValue,
  // eslint-disable-next-line import/no-unresolved
} from 'react-native-reanimated';
import React, { useState, useEffect, useRef } from 'react';

const dimensions = Dimensions.get('window');

export function normalizeDimensions(
  item: {
    width: number;
    height: number;
  },
  resultWidth = dimensions.width,
) {
  const scaleFactor = item.width / resultWidth;
  const targetHeight = item.height / scaleFactor;

  return {
    targetWidth: resultWidth,
    targetHeight,
  };
}

export function friction(value: number) {
  'worklet';

  const MAX_FRICTION = 30;
  const MAX_VALUE = 200;

  const res = Math.max(
    1,
    Math.min(
      MAX_FRICTION,
      1 + (Math.abs(value) * (MAX_FRICTION - 1)) / MAX_VALUE,
    ),
  );

  if (value < 0) {
    return -res;
  }

  return res;
}

// in order to simultaneousHandlers to work
// we need to trigger rerender of the screen
// so refs will be valid then
export function fixGestureHandler() {
  const [, set] = useState(0);

  useEffect(() => {
    set((v) => v + 1);
  }, []);
}

export function getShouldRender(
  index: number,
  activeIndex: number,
  diffValue = 3,
) {
  const diff = Math.abs(index - activeIndex);

  if (diff > diffValue) {
    return false;
  }

  return true;
}

export function clamp(
  value: number,
  lowerBound: number,
  upperBound: number,
) {
  'worklet';

  return Math.min(Math.max(lowerBound, value), upperBound);
}

export const workletNoop = () => {
  'worklet';
};

export function useAnimatedReaction<R>(
  prepare: () => R,
  react: (params: R) => void,
) {
  const inputsRef = useRef<{
    inputs: any;
  }>(null);
  if (inputsRef.current === null) {
    // @ts-ignore
    inputsRef.current = {
      // @ts-ignore
      inputs: Object.values(prepare._closure),
    };
  }
  const { inputs } = inputsRef.current;
  useMapper(
    () => {
      'worklet';

      const input = prepare();
      react(input);
    },
    inputs,
    [],
  );
}

export function useSharedValue<T>(value: T) {
  const ref = useRef<T>(null);
  if (ref.current === null) {
    // @ts-ignore
    ref.current = value;
  }

  return REAuseSharedValue(ref.current);
}

export const typedMemo: <T>(c: T) => T = React.memo;
