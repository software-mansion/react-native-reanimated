'use strict';
import { useRef } from 'react';
import type { HostInstance } from 'react-native';

import type {
  InstanceOrElement,
  InternalHostInstance,
  ShadowNodeWrapper,
} from '../commonTypes';
import { findNodeHandle } from '../platformFunctions/findNodeHandle';
import type {
  AnimatedRef,
  AnimatedRefObserver,
  MaybeObserverCleanup,
} from './commonTypes';

export function useAnimatedRefBase<TRef extends InstanceOrElement>(
  getWrapper: (ref: InternalHostInstance) => ShadowNodeWrapper
): AnimatedRef<TRef> {
  const observers = useRef<Map<AnimatedRefObserver, MaybeObserverCleanup>>(
    new Map()
  ).current;
  const wrapperRef = useRef<ShadowNodeWrapper | null>(null);
  const resultRef = useRef<AnimatedRef<TRef> | null>(null);

  if (!resultRef.current) {
    const fun = <AnimatedRef<TRef>>((ref) => {
      if (ref) {
        wrapperRef.current = getWrapper(ref);

        // We have to unwrap the tag from the shadow node wrapper.
        // @ts-expect-error this can't be typed well.
        fun.getTag = () => ref.getScrollableNode?.() || findNodeHandle(ref);
        fun.current = ref;

        if (observers.size) {
          const currentTag = fun?.getTag?.() ?? null;
          observers.forEach((cleanup, observer) => {
            // Perform the cleanup before calling the observer again.
            // This ensures that all events that were set up in the observer
            // are cleaned up before the observer sets up new events during
            // the next call.
            cleanup?.();
            observers.set(observer, observer(currentTag));
          });
        }
      }

      return wrapperRef.current;
    });

    fun.observe = (observer: AnimatedRefObserver) => {
      // Call observer immediately to get the initial value
      const cleanup = observer(fun?.getTag?.() ?? null);
      observers.set(observer, cleanup);

      return () => {
        observers.get(observer)?.();
        observers.delete(observer);
      };
    };

    fun.current = null;
    resultRef.current = fun;
  }

  return resultRef.current;
}

export function useAnimatedRefWeb<
  TRef extends InstanceOrElement = HostInstance,
>(): AnimatedRef<TRef> {
  return useAnimatedRefBase<TRef>((ref) => {
    if (ref.getScrollableNode) {
      return ref.getScrollableNode();
    }
    if (ref.getNativeScrollRef) {
      return ref.getNativeScrollRef();
    }
    return ref;
  });
}
