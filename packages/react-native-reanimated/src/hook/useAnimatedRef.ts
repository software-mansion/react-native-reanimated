'use strict';
import type { Component } from 'react';
import { useRef, useState } from 'react';
import type { FlatList } from 'react-native';
import {
  makeShareableCloneRecursive,
  shareableMappingCache,
} from 'react-native-worklets';

import { SHOULD_BE_USE_WEB } from '../common/constants';
import type { ShadowNodeWrapper } from '../commonTypes';
import { getShadowNodeWrapperFromRef } from '../fabricUtils';
import { makeMutable } from '../mutables';
import { findNodeHandle } from '../platformFunctions/findNodeHandle';
import type {
  AnimatedRef,
  AnimatedRefObserver,
  AnimatedRefOnUI,
} from './commonTypes';

interface MaybeScrollableComponent extends Component {
  getNativeScrollRef?: FlatList['getNativeScrollRef'];
  getScrollableNode?: FlatList['getScrollableNode'];
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
  getWrapper: (component: TComponent) => ShadowNodeWrapper
): AnimatedRef<TComponent> {
  const [observers] = useState<Set<AnimatedRefObserver>>(() => new Set());
  const wrapperRef = useRef<ShadowNodeWrapper | null>(null);

  const ref = useRef<AnimatedRef<TComponent> | null>(null);

  if (!ref.current) {
    const fun: AnimatedRef<TComponent> = <AnimatedRef<TComponent>>((
      component
    ) => {
      if (component) {
        wrapperRef.current = getWrapper(component);

        // We have to unwrap the tag from the shadow node wrapper.
        fun.getTag = () =>
          findNodeHandle(getComponentOrScrollable(component) as Component)!;

        fun.current = component;

        if (observers.size) {
          const tag = fun?.getTag?.() ?? null;
          observers.forEach((observer) => observer(tag));
        }
      }

      return wrapperRef.current;
    });

    fun.observe = (observer: AnimatedRefObserver) => {
      observers.add(observer);
      // Call observer immediately to get the initial value
      observer(fun?.getTag?.() ?? null);

      return () => {
        observers.delete(observer);
      };
    };

    fun.current = null;
    ref.current = fun;
  }

  return ref.current;
}

function useAnimatedRefNative<
  TComponent extends Component,
>(): AnimatedRef<TComponent> {
  const [sharedWrapper] = useState(() =>
    makeMutable<ShadowNodeWrapper | null>(null)
  );

  const ref = useAnimatedRefBase<TComponent>((component) => {
    const currentWrapper = getShadowNodeWrapperFromRef(
      getComponentOrScrollable(component) as Component
    );

    sharedWrapper.value = currentWrapper;

    return currentWrapper;
  });

  if (!shareableMappingCache.get(ref)) {
    const animatedRefShareableHandle = makeShareableCloneRecursive({
      __init: (): AnimatedRefOnUI => {
        'worklet';
        return () => sharedWrapper.value;
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
