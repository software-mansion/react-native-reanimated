'use strict';
import type { Ref } from 'react';
import { useRef, useState } from 'react';
import {
  createSerializable,
  serializableMappingCache,
} from 'react-native-worklets';

import { SHOULD_BE_USE_WEB } from '../common/constants';
import type {
  InstanceOrElement,
  InternalHostInstance,
  ShadowNodeWrapper,
} from '../commonTypes';
import { getShadowNodeWrapperFromRef } from '../fabricUtils';
import { makeMutable } from '../mutables';
import { findNodeHandle } from '../platformFunctions/findNodeHandle';
import type {
  AnimatedRef,
  AnimatedRefObserver,
  AnimatedRefOnUI,
  MaybeObserverCleanup,
} from './commonTypes';

function getComponentOrScrollable(ref: InternalHostInstance) {
  return ref.getNativeScrollRef?.() ?? ref.getScrollableNode?.() ?? ref;
}

function useAnimatedRefBase<TRef extends InstanceOrElement>(
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
        fun.getTag = () =>
          findNodeHandle(getComponentOrScrollable(ref)) ?? null;
        fun.current = ref as typeof fun.current;

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

function useAnimatedRefNative<
  TRef extends InstanceOrElement = InternalHostInstance,
>(): AnimatedRef<TRef> {
  const [sharedWrapper] = useState(() =>
    makeMutable<ShadowNodeWrapper | null>(null)
  );

  const resultRef = useAnimatedRefBase<TRef>((ref) => {
    const currentWrapper = getShadowNodeWrapperFromRef(
      getComponentOrScrollable(ref)
    );

    sharedWrapper.value = currentWrapper;

    return currentWrapper;
  });

  if (!serializableMappingCache.get(resultRef)) {
    const animatedRefSerializableHandle = createSerializable({
      __init: (): AnimatedRefOnUI => {
        'worklet';
        return () => sharedWrapper.value;
      },
    });
    serializableMappingCache.set(resultRef, animatedRefSerializableHandle);
  }

  return resultRef;
}

function useAnimatedRefWeb<
  TRef extends InstanceOrElement = InternalHostInstance,
>(): AnimatedRef<TRef> {
  return useAnimatedRefBase(getComponentOrScrollable);
}

/**
 * Lets you get a reference of a view that you can use inside a worklet.
 *
 * @returns An object with a `.current` property which contains an instance of
 *   the reference object.
 * @see https://docs.swmansion.com/react-native-reanimated/docs/core/useAnimatedRef
 */
export const useAnimatedRef = SHOULD_BE_USE_WEB
  ? useAnimatedRefWeb
  : useAnimatedRefNative;

export function isAnimatedRef<TRef extends InstanceOrElement>(
  ref: Ref<TRef> | AnimatedRef<TRef>
): ref is AnimatedRef<TRef> {
  return ref !== null && 'observe' in ref;
}
