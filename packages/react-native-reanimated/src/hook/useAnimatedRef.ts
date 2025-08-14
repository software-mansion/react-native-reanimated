'use strict';
import { useRef, useState } from 'react';
import {
  createSerializable,
  serializableMappingCache,
} from 'react-native-worklets';

import { SHOULD_BE_USE_WEB } from '../common/constants';
import type {
  ComponentWithInstanceMethods,
  ShadowNodeWrapper,
} from '../commonTypes';
import { getViewPropImpl } from '../core';
import { getShadowNodeWrapperFromRef } from '../fabricUtils';
import { makeMutable } from '../mutables';
import { findNodeHandle } from '../platformFunctions/findNodeHandle';
import type {
  AnimatedRef,
  AnimatedRefObserver,
  AnimatedRefOnUI,
  MaybeObserverCleanup,
} from './commonTypes';

function getComponentOrScrollable(component: ComponentWithInstanceMethods) {
  return (
    component.getNativeScrollRef?.() ??
    component.getScrollableNode?.() ??
    component
  );
}

function useAnimatedRefBase<TComponent extends ComponentWithInstanceMethods>(
  getWrapper: (component: TComponent) => ShadowNodeWrapper
): AnimatedRef<TComponent> {
  const observers = useRef<Map<AnimatedRefObserver, MaybeObserverCleanup>>(
    new Map()
  ).current;
  const shadowNodeWrapperRef = useRef<ShadowNodeWrapper | null>(null);
  const resultRef = useRef<AnimatedRef<TComponent> | null>(null);

  if (!resultRef.current) {
    const fun = <AnimatedRef<TComponent>>((component) => {
      if (component) {
        shadowNodeWrapperRef.current = getWrapper(component);

        // We have to unwrap the tag from the shadow node wrapper.
        fun.getTag = () => findNodeHandle(getComponentOrScrollable(component));
        fun.current = component;

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

      return shadowNodeWrapperRef.current;
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

    fun.getViewProp = (propName: string) =>
      getViewPropImpl(fun.current, propName);

    fun.current = null;
    resultRef.current = fun;
  }

  return resultRef.current;
}

function useAnimatedRefNative<
  TComponent extends ComponentWithInstanceMethods = React.Component,
>(): AnimatedRef<TComponent> {
  const [sharedWrapper] = useState(() =>
    makeMutable<ShadowNodeWrapper | null>(null)
  );

  const resultRef = useAnimatedRefBase<TComponent>((component) => {
    const currentWrapper = getShadowNodeWrapperFromRef(
      getComponentOrScrollable(component)
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
  TComponent extends ComponentWithInstanceMethods = React.Component,
>(): AnimatedRef<TComponent> {
  return useAnimatedRefBase<TComponent>((component) =>
    getComponentOrScrollable(component)
  );
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
