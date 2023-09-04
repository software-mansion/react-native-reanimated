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
  if (global._IS_FABRIC && component.getNativeScrollRef) {
    return component.getNativeScrollRef();
  } else if (!global._IS_FABRIC && component.getScrollableNode) {
    return component.getScrollableNode();
  }
  return component;
}

const getTagValueFunction = global._IS_FABRIC
  ? getShadowNodeWrapperFromRef
  : findNodeHandle;

export function useAnimatedRef<
  T extends MaybeScrollableComponent
>(): AnimatedRef<T> {
  const tag = useSharedValue<number | ShadowNodeWrapper | null>(-1);
  const viewName = useSharedValue<string | null>(null);

  const ref = useRef<AnimatedRef<T>>();

  if (!ref.current) {
    const fun: AnimatedRef<T> = <AnimatedRef<T>>((component) => {
      // enters when ref is set by attaching to a component
      if (component) {
        tag.value = getTagValueFunction(getComponentOrScrollable(component));
        fun.current = component;
        // viewName is required only on iOS with Paper
        if (Platform.OS === 'ios' && !global._IS_FABRIC) {
          viewName.value = component?.viewConfig?.uiViewClassName || 'RCTView';
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
