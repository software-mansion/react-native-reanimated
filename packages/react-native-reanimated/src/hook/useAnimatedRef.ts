'use strict';
import type { Component } from 'react';
import { useRef } from 'react';
import { useSharedValue } from './useSharedValue';
import type { AnimatedRef, AnimatedRefOnUI } from './commonTypes';
import type { ShadowNodeWrapper } from '../commonTypes';
import { getShadowNodeWrapperFromRef } from '../fabricUtils';
import { makeShareableCloneRecursive } from '../shareables';
import { shareableMappingCache } from '../shareableMappingCache';
import { Platform } from 'react-native';
import { findNodeHandle } from '../platformFunctions/findNodeHandle';
import type { ScrollView, FlatList } from 'react-native';
import { isFabric, isWeb } from '../PlatformChecker';

const IS_WEB = isWeb();

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
  if (isFabric() && component.getNativeScrollRef) {
    return component.getNativeScrollRef();
  } else if (!isFabric() && component.getScrollableNode) {
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
  const tag = useSharedValue<number | ShadowNodeWrapper | null>(-1);
  const viewName = useSharedValue<string | null>(null);

  const ref = useRef<AnimatedRef<TComponent>>();

  if (!ref.current) {
    const fun: AnimatedRef<TComponent> = <AnimatedRef<TComponent>>((
      component
    ) => {
      // enters when ref is set by attaching to a component
      if (component) {
        const getTagValueFunction = isFabric()
          ? getShadowNodeWrapperFromRef
          : findNodeHandle;

        const getTagOrShadowNodeWrapper = () => {
          return IS_WEB
            ? getComponentOrScrollable(component)
            : getTagValueFunction(getComponentOrScrollable(component));
        };

        tag.value = getTagOrShadowNodeWrapper();

        // On Fabric we have to unwrap the tag from the shadow node wrapper
        fun.getTag = isFabric()
          ? () => findNodeHandle(getComponentOrScrollable(component))
          : getTagOrShadowNodeWrapper;

        fun.current = component;
        // viewName is required only on iOS with Paper
        if (Platform.OS === 'ios' && !isFabric()) {
          viewName.value =
            (component as MaybeScrollableComponent)?.viewConfig
              ?.uiViewClassName || 'RCTView';
        }
      }
      return tag.value;
    });

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
