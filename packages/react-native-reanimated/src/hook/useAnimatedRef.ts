'use strict';
import type { Component } from 'react';
import { useRef } from 'react';
import type { FlatList, ScrollView } from 'react-native';
import { Platform } from 'react-native';

import type { ShadowNodeWrapper } from '../commonTypes';
import { getShadowNodeWrapperFromRef } from '../fabricUtils';
import { isFabric, shouldBeUseWeb } from '../PlatformChecker';
import { findNodeHandle } from '../platformFunctions/findNodeHandle';
import { shareableMappingCache } from '../shareableMappingCache';
import { makeShareableCloneRecursive } from '../shareables';
import type {
  AnimatedRef,
  AnimatedRefObserver,
  AnimatedRefOnUI,
  MaybeObserverCleanup,
} from './commonTypes';
import { useSharedValue } from './useSharedValue';

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

function useAnimatedRefNative<
  TComponent extends Component,
>(): AnimatedRef<TComponent> {
  const tag = useSharedValue<number | ShadowNodeWrapper | null>(-1);
  const observers = useRef<Map<AnimatedRefObserver, MaybeObserverCleanup>>(
    new Map()
  ).current;
  const viewName = useSharedValue<string | null>(null);

  const ref = useRef<AnimatedRef<TComponent> | null>(null);

  if (!ref.current) {
    const fun: AnimatedRef<TComponent> = <AnimatedRef<TComponent>>((
      component
    ) => {
      // enters when ref is set by attaching to a component
      if (component) {
        const getTagValueFunction = isFabric()
          ? getShadowNodeWrapperFromRef
          : findNodeHandle;

        const getTagOrShadowNodeWrapper = () =>
          getTagValueFunction(getComponentOrScrollable(component));

        tag.value = getTagOrShadowNodeWrapper();
        fun.getTag = () => findNodeHandle(getComponentOrScrollable(component));
        fun.current = component;

        // viewName is required only on iOS with Paper
        if (Platform.OS === 'ios' && !isFabric()) {
          viewName.value =
            (component as MaybeScrollableComponent)?.viewConfig
              ?.uiViewClassName || 'RCTView';
        }
      }

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

      return tag.value;
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

    const animatedRefShareableHandle = makeShareableCloneRecursive({
      __init: () => {
        'worklet';
        const f: AnimatedRefOnUI = () => tag.value;
        f.viewName = viewName;
        return f;
      },
    });
    shareableMappingCache.set(fun, animatedRefShareableHandle);
    ref.current = fun;
  }

  return ref.current;
}

function useAnimatedRefWeb<
  TComponent extends Component,
>(): AnimatedRef<TComponent> {
  const tagRef = useRef<ShadowNodeWrapper | null>(null);
  const observers = useRef<Map<AnimatedRefObserver, MaybeObserverCleanup>>(
    new Map()
  ).current;

  const ref = useRef<AnimatedRef<TComponent> | null>(null);

  if (!ref.current) {
    /** Called by React when ref is attached to a component. */
    const fun: AnimatedRef<TComponent> = <AnimatedRef<TComponent>>((
      component
    ) => {
      if (component) {
        const getTagOrShadowNodeWrapper = () => {
          return getComponentOrScrollable(component);
        };

        tagRef.current = getTagOrShadowNodeWrapper();

        // We have to unwrap the tag from the shadow node wrapper.
        fun.getTag = () =>
          findNodeHandle(getComponentOrScrollable(component) as Component)!;
        fun.current = component;
      }

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

      return tagRef.current;
    });

    fun.observe = (observer: AnimatedRefObserver) => {
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
