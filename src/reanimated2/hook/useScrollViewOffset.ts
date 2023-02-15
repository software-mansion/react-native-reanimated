import { MutableRefObject, RefObject, useEffect, useRef } from 'react';

import type Animated from 'react-native-reanimated';
import { scrollTo } from '../NativeMethods';
import { ScrollEvent } from './useAnimatedScrollHandler';
import { SharedValue } from '../commonTypes';
import { findNodeHandle } from 'react-native';
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

const addListenerToScroll = (
  offsetRef: MutableRefObject<SharedValue<number>>,
  animatedRef: any
) => {
  runOnUI(() => {
    'worklet';
    const offsetRefCurrent = offsetRef.current;
    offsetRefCurrent.addListener(animatedRef(), (newValue: any) => {
      scrollTo(animatedRef, 0, Number(newValue), false);
    });
  })();
};

export function useScrollViewOffset(
  aref: RefObject<Animated.ScrollView>
): SharedValue<number> {
  const offsetRef = useRef(useSharedValue(0));

  addListenerToScroll(offsetRef, aref);

  const event = useEvent<ScrollEvent>((event: ScrollEvent) => {
    'worklet';
    offsetRef.current.value =
      event.contentOffset.x === 0
        ? event.contentOffset.y
        : event.contentOffset.x;
  }, scrollEventNames);

  useEffect(() => {
    const viewTag = findNodeHandle(aref.current);
    event.current?.registerForEvents(viewTag as number);
  }, [aref.current]);

  return offsetRef.current;
}
