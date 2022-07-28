import { RefObject, useEffect, useRef } from 'react';
import { findNodeHandle } from 'react-native';
import Animated from 'react-native-reanimated';
import { useEvent, useSharedValue } from '.';
import { SharedValue } from '../commonTypes';
import WorkletEventHandler from '../WorkletEventHandler';
import { ScrollEvent } from './useAnimatedScrollHandler';

export type ScrollViewPosition = {
  offset: SharedValue<number>,
}

// This comes from createAnimatedComponent
const has = <K extends string>(
  key: K,
  x: unknown
): x is { [key in K]: unknown } => {
  if (typeof x === 'function' || typeof x === 'object') {
    if (x === null || x === undefined) {
      return false;
    } else {
      return key in x;
    }
  }
  return false;
};

export function useScrollViewPosition(
  aref: RefObject<Animated.ScrollView>
): ScrollViewPosition {
  const positionRef = useRef<ScrollViewPosition>({
    offset: useSharedValue(0),
  });


  const subscribeForEvents = [
    'onScroll',
    'onScrollBeginDrag',
    'onScrollEndDrag',
    'onMomentumScrollBegin',
    'onMomentumScrollEnd'
  ];

  const event = useEvent<ScrollEvent>(
    (event: ScrollEvent) => {
      'worklet';
      positionRef.current.offset.value = event.contentOffset.y;
    },
    subscribeForEvents,
  );

  // Subscribe for events only after the render happens
  useEffect(() => {
    // const viewTag = findNodeHandle(aref.current);

    // console.log('viewTag:', viewTag);
    // console.log('aref.current:', aref.current);
    // console.log('props:', aref.current?.props);

    // for (const key in aref.current?.props) {
    //   const prop = aref.current?.props[key];
    //   console.log(prop);
    //   if (
    //     has('current', prop)
    //     && prop.current instanceof WorkletEventHandler
    //   ) {
    //     console.log("found" + key);
    //     prop.current.registerForEvents(viewTag as number, key);
    //   }
    // }

    
  });

  return positionRef.current;
}