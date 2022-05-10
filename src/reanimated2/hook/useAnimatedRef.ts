import { Component, useRef } from 'react';
import { useSharedValue } from './useSharedValue';
import { RefObjectFunction } from './commonTypes';
import { ShadowNodeWrapper } from '../commonTypes';
import { getTag } from '../NativeMethods';
import { getShadowNodeWrapperFromHostInstance } from '../fabricUtils';

export function useAnimatedRef<T extends Component>(): RefObjectFunction<T> {
  const tag = useSharedValue<number | ShadowNodeWrapper | null>(-1);
  const ref = useRef<RefObjectFunction<T>>();
  const isFabric = global._IS_FABRIC;

  if (!ref.current) {
    const fun: RefObjectFunction<T> = <RefObjectFunction<T>>((component) => {
      'worklet';
      // enters when ref is set by attaching to a component
      if (component) {
        tag.value = isFabric
          ? getShadowNodeWrapperFromHostInstance(component)
          : getTag(component);
        fun.current = component;
      }
      return tag.value;
    });

    Object.defineProperty(fun, 'current', {
      value: null,
      writable: true,
      enumerable: false,
    });
    ref.current = fun;
  }

  return ref.current;
}
