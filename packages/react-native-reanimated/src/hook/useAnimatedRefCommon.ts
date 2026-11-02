'use strict';
import { useRef } from 'react';

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

type ObserverRun = {
  readonly tag: number | null;
  readonly cleanup: MaybeObserverCleanup;
};

export function useAnimatedRefBase<TRef extends InstanceOrElement>(
  getWrapper: (ref: InternalHostInstance) => ShadowNodeWrapper
): AnimatedRef<TRef> {
  const observers = useRef<Map<AnimatedRefObserver, ObserverRun>>(
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
          observers.forEach(({ tag, cleanup }, observer) => {
            // React calls the ref again for the same view whenever the ref passed to it changes.
            if (tag === currentTag) {
              return;
            }
            // Perform the cleanup before calling the observer again.
            // This ensures that all events that were set up in the observer
            // are cleaned up before the observer sets up new events during
            // the next call.
            cleanup?.();
            observers.set(observer, {
              tag: currentTag,
              cleanup: observer(currentTag),
            });
          });
        }
      }

      return wrapperRef.current;
    });

    fun.observe = (observer: AnimatedRefObserver) => {
      // Call observer immediately to get the initial value
      const tag = fun?.getTag?.() ?? null;
      observers.set(observer, { tag, cleanup: observer(tag) });

      return () => {
        observers.get(observer)?.cleanup?.();
        observers.delete(observer);
      };
    };

    fun.current = null;
    resultRef.current = fun;
  }

  return resultRef.current;
}
