'use strict';
import type { Component } from 'react';
import { useRef, useState } from 'react';
import type { FlatList, ScrollView } from 'react-native';

import type { ShadowNodeWrapper } from '../commonTypes';
import { getShadowNodeWrapperFromRef } from '../fabricUtils';
import { makeMutable } from '../mutables';
import { isFabric, isIOS, isMacOS, shouldBeUseWeb } from '../PlatformChecker';
import { findNodeHandle } from '../platformFunctions/findNodeHandle';
import { shareableMappingCache } from '../shareableMappingCache';
import { makeShareableCloneRecursive } from '../shareables';
import type {
  AnimatedRef,
  AnimatedRefObserver,
  AnimatedRefOnUI,
  MaybeObserverCleanup,
} from './commonTypes';

const SHOULD_BE_USE_WEB = shouldBeUseWeb();

interface MaybeScrollableComponent extends Component {
  getNativeScrollRef?: FlatList['getNativeScrollRef'];
  getScrollableNode?:
    | ScrollView['getScrollableNode']
    | FlatList['getScrollableNode'];
  viewConfig?: {
    uiViewClassName?: string;
  };
}

function getComponentOrScrollable(component: MaybeScrollableComponent) {
  if (component.getNativeScrollRef) {
    return component.getNativeScrollRef();
  }
  if (component.getScrollableNode) {
    return component.getScrollableNode();
  }
  return component;
}

function useAnimatedRefBase<TComponent extends Component>(
  getWrapper: (component: TComponent) => ShadowNodeWrapper | number | null
): AnimatedRef<TComponent> {
  const observers = useRef<Map<AnimatedRefObserver, MaybeObserverCleanup>>(
    new Map()
  ).current;
  const tagOrWrapperRef = useRef<ShadowNodeWrapper | number | null>(-1);

  const ref = useRef<AnimatedRef<TComponent> | null>(null);

  if (!ref.current) {
    const fun: AnimatedRef<TComponent> = <AnimatedRef<TComponent>>((
      component
    ) => {
      if (component) {
        tagOrWrapperRef.current = getWrapper(component);

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

      return tagOrWrapperRef.current;
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
    ref.current = fun;
  }

  return ref.current;
}

const IS_APPLE = isIOS() || isMacOS();

function useAnimatedRefNative<
  TComponent extends Component,
>(): AnimatedRef<TComponent> {
  const [viewName] = useState(() =>
    // viewName is required only on iOS/MacOS with Paper
    !isFabric() && IS_APPLE ? makeMutable<string | null>(null) : null
  );
  const [tagOrWrapper] = useState(() =>
    makeMutable<ShadowNodeWrapper | number | null>(null)
  );

  const ref = useAnimatedRefBase<TComponent>((component) => {
    const getTagOrWrapper = isFabric()
      ? getShadowNodeWrapperFromRef
      : findNodeHandle;

    tagOrWrapper.value = getTagOrWrapper(getComponentOrScrollable(component));

    if (viewName) {
      viewName.value =
        (component as MaybeScrollableComponent)?.viewConfig?.uiViewClassName ||
        'RCTView';
    }

    return tagOrWrapper.value;
  });

  if (!shareableMappingCache.get(ref)) {
    const animatedRefShareableHandle = makeShareableCloneRecursive({
      __init: () => {
        'worklet';
        const f: AnimatedRefOnUI = () => tagOrWrapper.value;
        if (viewName) {
          f.viewName = viewName;
        }
        return f;
      },
    });
    shareableMappingCache.set(ref, animatedRefShareableHandle);
  }

  return ref;
}

function useAnimatedRefWeb<
  TComponent extends Component,
>(): AnimatedRef<TComponent> {
  return useAnimatedRefBase<TComponent>((component) =>
    getComponentOrScrollable(component)
  );
}

/**
 * Lets you get a reference of a view that you can use inside a worklet.
 *
 * @returns An object with a `.current` property which contains an instance of a
 *   component.
 * @see https://docs.swmansion.com/react-native-reanimated/docs/core/useAnimatedRef
 */
export const useAnimatedRef = SHOULD_BE_USE_WEB
  ? useAnimatedRefWeb
  : useAnimatedRefNative;
