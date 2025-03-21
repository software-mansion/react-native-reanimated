'use strict';
import type { Component, FC, ComponentPropsWithRef } from 'react';
import { useRef } from 'react';
import type { FlatList } from 'react-native';
import {
  makeShareableCloneRecursive,
  shareableMappingCache,
} from 'react-native-worklets';

import type { ShadowNodeWrapper } from '../commonTypes';
import { getShadowNodeWrapperFromRef } from '../fabricUtils';
import { isWeb } from '../PlatformChecker';
import { findNodeHandle } from '../platformFunctions/findNodeHandle';
import type { AnimatedRef, AnimatedRefOnUI } from './commonTypes';
import { useSharedValue } from './useSharedValue';

const IS_WEB = isWeb();

interface MaybeScrollableComponent extends Component {
  getNativeScrollRef?: FlatList['getNativeScrollRef'];
  viewConfig?: {
    uiViewClassName?: string;
  };
}

function getComponentOrScrollable(component: MaybeScrollableComponent) {
  if (component.getNativeScrollRef) {
    return component.getNativeScrollRef();
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
  // TODO: theu unknown shouldnt be here but it throws an error when it is, although the refs work perfectly fine
  T extends Component | FC<ComponentPropsWithRef<any>> | unknown,
>(): AnimatedRef<T> {
  const tag = useSharedValue<ShadowNodeWrapper | null>(null);

  const ref = useRef<AnimatedRef<T>>();

  if (!ref.current) {
    const fun: AnimatedRef<T> = <AnimatedRef<T>>((component) => {
      // enters when ref is set by attaching to a component
      if (component) {
        const getTagOrShadowNodeWrapper = () => {
          return IS_WEB
            ? // TODO: this was only to poc passing functional component, this tyes should be fixed i think
              getComponentOrScrollable(
                component as unknown as MaybeScrollableComponent
              )
            : getShadowNodeWrapperFromRef(
                getComponentOrScrollable(
                  component as unknown as MaybeScrollableComponent
                ) as Component
              );
        };

        tag.value = getTagOrShadowNodeWrapper() as ShadowNodeWrapper;

        // On Fabric we have to unwrap the tag from the shadow node wrapper
        // TODO: remove casting
        fun.getTag = () =>
          findNodeHandle(
            getComponentOrScrollable(
              component as unknown as MaybeScrollableComponent
            ) as Component
          )!;

        fun.current = component;
      }
      return tag.value;
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
