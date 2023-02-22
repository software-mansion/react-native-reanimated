import { Component, useRef } from 'react';
import { useSharedValue } from './useSharedValue';
import { RefObjectFunction } from './commonTypes';
import { ShadowNodeWrapper } from '../commonTypes';
import { getTag } from '../NativeMethods';
import { getShadowNodeWrapperFromHostInstance } from '../fabricUtils';
import {
  makeShareableCloneRecursive,
  registerShareableMapping,
} from '../shareables';

function getShareableShadowNodeFromComponent(
  component: Component
): ShadowNodeWrapper {
  return getShadowNodeWrapperFromHostInstance(component);
}

const getTagValueFunction = global._IS_FABRIC
  ? getShareableShadowNodeFromComponent
  : getTag;

export function useAnimatedRef<T extends Component>(): RefObjectFunction<T> {
  const tag = useSharedValue<number | ShadowNodeWrapper | null>(-1);
  const ref = useRef<RefObjectFunction<T>>();

  if (!ref.current) {
    const fun: RefObjectFunction<T> = <RefObjectFunction<T>>((component) => {
      // enters when ref is set by attaching to a component
      if (component) {
        tag.value = getTagValueFunction(component);
        fun.current = component;
      }
      return tag.value;
    });

    fun.current = null;

    const remoteRef = makeShareableCloneRecursive({
      __init: () => {
        'worklet';
        return () => tag.value;
      },
    });
    registerShareableMapping(fun, remoteRef);

    ref.current = fun;
  }

  return ref.current;
}
