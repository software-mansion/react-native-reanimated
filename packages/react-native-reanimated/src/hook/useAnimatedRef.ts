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

function useAnimatedRefNative<
  TComponent extends Component,
>(): AnimatedRef<TComponent> {
  const [wrapper] = useState(() => makeMutable<ShadowNodeWrapper | null>(null));
  const [observers] = useState<Set<AnimatedRefObserver>>(() => new Set());
  const wrapperRef = useRef<ShadowNodeWrapper | null>(null);

  const ref = useRef<AnimatedRef<TComponent> | null>(null);

  if (!ref.current) {
    /** Called by React when ref is attached to a component. */
    const fun: AnimatedRef<TComponent> = <AnimatedRef<TComponent>>((
      component
    ) => {
      let currentWrapper: ShadowNodeWrapper | null = null;
      if (component) {
        const getTagOrShadowNodeWrapper = () => {
          return getShadowNodeWrapperFromRef(
            getComponentOrScrollable(component) as Component
          );
        };

        currentWrapper = getTagOrShadowNodeWrapper();
        wrapper.value = currentWrapper;
        wrapperRef.current = currentWrapper;

        // We have to unwrap the tag from the shadow node wrapper.
        fun.getTag = () =>
          findNodeHandle(getComponentOrScrollable(component) as Component)!;

        fun.current = component;
      }

      if (observers.size) {
        const tag = fun?.getTag?.() ?? null;
        observers.forEach((observer) => observer(tag));
      }

      return wrapperRef.current;
    });

    fun.current = null;

    fun.observe = (observer: AnimatedRefObserver) => {
      observers.add(observer);
      // Call it immediately to get the initial value
      observer(fun?.getTag?.() ?? null);

      return () => {
        observers.delete(observer);
      };
    };

    const animatedRefShareableHandle = makeShareableCloneRecursive({
      __init: (): AnimatedRefOnUI => {
        'worklet';
        return () => wrapper.value;
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
  const [observers] = useState<Set<AnimatedRefObserver>>(() => new Set());

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
        const tag = fun?.getTag?.() ?? null;
        observers.forEach((observer) => observer(tag));
      }

      return tagRef.current;
    });

    fun.current = null;

    fun.observe = (observer: AnimatedRefObserver) => {
      observers.add(observer);
      // Call it immediately to get the initial value
      observer(fun?.getTag?.() ?? null);
    };

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
