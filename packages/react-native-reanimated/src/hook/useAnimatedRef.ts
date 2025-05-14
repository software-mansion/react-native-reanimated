'use strict';
import type { Component } from 'react';
import { useRef } from 'react';
import type { FlatList } from 'react-native';
import {
  makeShareableCloneRecursive,
  shareableMappingCache,
} from 'react-native-worklets';

import { IS_WEB } from '../common';
import type { ShadowNodeWrapper } from '../commonTypes';
import { getShadowNodeWrapperFromRef } from '../fabricUtils';
import { findNodeHandle } from '../platformFunctions/findNodeHandle';
import type { AnimatedRef, AnimatedRefOnUI } from './commonTypes';
import { useSharedValue } from './useSharedValue';

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

/**
 * Lets you get a reference of a view that you can use inside a worklet.
 *
 * @returns An object with a `.current` property which contains an instance of a
 *   component.
 * @see https://docs.swmansion.com/react-native-reanimated/docs/core/useAnimatedRef
 */
export function useAnimatedRef<
  TComponent extends Component,
>(): AnimatedRef<TComponent> {
  const tag = useSharedValue<ShadowNodeWrapper | null>(null);

  const ref = useRef<AnimatedRef<TComponent> | null>(null);

  if (!ref.current) {
    /** Called by React when ref is attached to a component. */
    const fun: AnimatedRef<TComponent> = <AnimatedRef<TComponent>>((
      component
    ) => {
      let initialTag: ShadowNodeWrapper | null = null;
      if (component) {
        const getTagOrShadowNodeWrapper = () => {
          return IS_WEB
            ? getComponentOrScrollable(component)
            : getShadowNodeWrapperFromRef(
                getComponentOrScrollable(component) as Component
              );
        };

        initialTag = getTagOrShadowNodeWrapper();
        tag.value = initialTag;

        // We have to unwrap the tag from the shadow node wrapper.
        fun.getTag = () =>
          findNodeHandle(getComponentOrScrollable(component) as Component)!;

        fun.current = component;
      }
      return initialTag;
    });

    fun.current = null;

    const animatedRefShareableHandle = makeShareableCloneRecursive({
      __init: (): AnimatedRefOnUI => {
        'worklet';
        return () => tag.value;
      },
    });
    shareableMappingCache.set(fun, animatedRefShareableHandle);
    ref.current = fun;
  }

  return ref.current;
}
