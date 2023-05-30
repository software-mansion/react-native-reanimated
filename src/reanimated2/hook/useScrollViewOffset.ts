import { RefObject, useEffect, useRef } from 'react';

import type Animated from 'react-native-reanimated';
import { SharedValue as NativeSharedValue } from '../commonTypes';
import { ScrollEvent } from './useAnimatedScrollHandler';
import { SharedValue } from '../commonTypes';
import { scrollTo } from '../NativeMethods';
import { findNodeHandle, ScrollViewProps } from 'react-native';
import { useEvent } from './utils';
import { useSharedValue } from './useSharedValue';
import { runOnUI } from '../threads';

const scrollEventNames = [
  'onScroll',
  'onScrollBeginDrag',
  'onScrollEndDrag',
  'onMomentumScrollBegin',
  'onMomentumScrollEnd',
];

export interface AnimatedScrollViewProps extends ScrollViewProps {
  scrollViewOffset?: SharedValue<number>;
}

interface ScrollSharedValue<T> extends NativeSharedValue<T> {
  triggerScrollListener?: boolean;
  triggerOffsetEvent?: boolean;
}

const addListenerToScroll = (
  offsetRef: ScrollSharedValue<number>,
  animatedRef: any,
  horizontal: boolean
) => {
  return runOnUI(() => {
    'worklet';
    offsetRef.triggerScrollListener = true;
    offsetRef.triggerOffsetEvent = true;
    return offsetRef.addListener(animatedRef(), (newValue: any) => {
      if (offsetRef.triggerScrollListener) {
        const x = horizontal ? Number(newValue) : 0;
        const y = horizontal ? 0 : Number(newValue);
        offsetRef.triggerOffsetEvent = false;
        scrollTo(animatedRef, x, y, false);
      }
    });
  })();
};

const removeListenerFromScroll = (
  offsetRef: ScrollSharedValue<number>,
  animatedRef: any,
) => {
  runOnUI(() => {
    'worklet';
    offsetRef.removeListener(animatedRef());
  })();
}

export function useScrollViewOffset(
  aref: RefObject<Animated.ScrollView>,
  initialRef?: SharedValue<number>,
  horizontal?: boolean
): SharedValue<number> {
  const scrollPosition = useRef(
    initialRef !== undefined ? initialRef : useSharedValue(0)
  ).current as ScrollSharedValue<number>;

  const event = useEvent<ScrollEvent>((event: ScrollEvent) => {
    'worklet';
    if (!scrollPosition.triggerOffsetEvent) {
      scrollPosition.triggerOffsetEvent = true;
      return;
    }
    const newValue =
      event.contentOffset.x === 0
        ? event.contentOffset.y
        : event.contentOffset.x;

    scrollPosition.triggerScrollListener = false;
    // @ts-ignore Omit the setter to not override animation
    scrollPosition._value = newValue;
    scrollPosition.triggerScrollListener = true;
  }, scrollEventNames);

  useEffect(() => {
    scrollPosition.triggerOffsetEvent = true;
    scrollPosition.triggerScrollListener = true;

    if (horizontal !== undefined) {
      addListenerToScroll(scrollPosition, aref, horizontal);
    }
    
    const viewTag = findNodeHandle(
      (aref as RefObject<Animated.ScrollView>).current
    );
    event.current?.registerForEvents(viewTag as number);
    return () => {
      event.current?.unregisterFromEvents();
      removeListenerFromScroll(scrollPosition, aref);
    }
  }, [(aref as RefObject<Animated.ScrollView>).current]);

  return scrollPosition;
}
