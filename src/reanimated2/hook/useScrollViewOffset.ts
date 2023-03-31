import { RefObject, useEffect, useRef } from 'react';

import type Animated from 'react-native-reanimated';
import { scrollTo } from '../NativeMethods';
import { ScrollEvent } from './useAnimatedScrollHandler';
import { SharedValue } from '../commonTypes';
import { findNodeHandle } from 'react-native';
import { useEvent } from './utils';
import { useSharedValue } from './useSharedValue';
import { runOnUI } from '../threads';

interface ScrollSharedValue<T> extends SharedValue<T> {
  triggerScrollListener?: boolean;
}

const scrollEventNames = [
  'onScroll',
  'onScrollBeginDrag',
  'onScrollEndDrag',
  'onMomentumScrollBegin',
  'onMomentumScrollEnd',
];

const addListenerToScroll = (
  offsetRef: ScrollSharedValue<number>,
  animatedRef: any
) => {
  runOnUI(() => {
    'worklet';
    offsetRef.triggerScrollListener = true;
    offsetRef.addListener(animatedRef(), (newValue: any) => {
      if (offsetRef.triggerScrollListener) {
        scrollTo(animatedRef, 0, Number(newValue), false);
      }
    });
  })();
};

export function useScrollViewOffset(
  aref: RefObject<Animated.ScrollView>
): SharedValue<number> {
  const offsetRef: ScrollSharedValue<number> = useRef(
    useSharedValue(0)
  ).current;

  const event = useEvent<ScrollEvent>((event: ScrollEvent) => {
    'worklet';
    const newValue =
      event.contentOffset.x === 0
        ? event.contentOffset.y
        : event.contentOffset.x;
    // @ts-ignore Omit the setter to read current state of animation
    if (newValue === offsetRef._value) {
      return;
    }
    offsetRef.triggerScrollListener = false;
    // @ts-ignore Omit the setter to not override animation
    offsetRef._value = newValue;
    offsetRef.triggerScrollListener = true;
  }, scrollEventNames);

  useEffect(() => {
    addListenerToScroll(offsetRef, aref);
    const viewTag = findNodeHandle(aref.current);
    event.current?.registerForEvents(viewTag as number);
  }, [aref.current]);

  return offsetRef;
}
