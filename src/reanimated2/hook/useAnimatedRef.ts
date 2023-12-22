'use strict';
import type { Component } from 'react';
import { useRef } from 'react';
import { useSharedValue } from './useSharedValue';
import type { AnimatedRef } from './commonTypes';
import type { ShadowNodeWrapper } from '../commonTypes';
import { getShadowNodeWrapperFromRef } from '../fabricUtils';
import {
  makeShareableCloneRecursive,
  registerShareableMapping,
} from '../shareables';
import { Platform, findNodeHandle } from 'react-native';
import { isFabric } from '../PlatformChecker';

const IS_FABRIC = isFabric();

interface MaybeScrollableComponent extends Component {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getNativeScrollRef?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getScrollableNode?: any;
  viewConfig?: {
    uiViewClassName?: string;
  };
}

function getComponentOrScrollable(component: MaybeScrollableComponent) {
  if (IS_FABRIC && component.getNativeScrollRef) {
    return component.getNativeScrollRef();
  } else if (!IS_FABRIC && component.getScrollableNode) {
    return component.getScrollableNode();
  }
  return component;
}

const getTagValueFunction = IS_FABRIC
  ? getShadowNodeWrapperFromRef
  : findNodeHandle;

/**
 * Lets you get a reference of a view that you can use inside a worklet.
 *
 * @returns An object with a `.current` property which contains an instance of a component.
 * @see https://docs.swmansion.com/react-native-reanimated/docs/core/useAnimatedRef
 */
export function useAnimatedRef<
  TComponent extends Component
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
        tag.value = getTagValueFunction(getComponentOrScrollable(component));
        fun.current = component;
        // viewName is required only on iOS with Paper
        if (Platform.OS === 'ios' && !IS_FABRIC) {
          viewName.value =
            (component as MaybeScrollableComponent)?.viewConfig
              ?.uiViewClassName || 'RCTView';
        }
      }
      return tag.value;
    });

    fun.current = null;

    const remoteRef = makeShareableCloneRecursive({
      __init: () => {
        'worklet';
        const f = () => tag.value;
        f.viewName = viewName;
        return f;
      },
    });
    registerShareableMapping(fun, remoteRef);
    ref.current = fun;
  }

  return ref.current;
}
