import { Component, useRef } from 'react';
import { useSharedValue } from './useSharedValue';
import { RefObjectFunction } from './commonTypes';
import { getTag } from '../NativeMethods';

export function useAnimatedRef<T extends Component>(): RefObjectFunction<T> {
  const tag = useSharedValue<number | null>(-1);
  const ref = useRef<RefObjectFunction<T>>();
  const isFabric = global._IS_FABRIC;

  if (!ref.current) {
    const fun: RefObjectFunction<T> = <RefObjectFunction<T>>((component) => {
      'worklet';
      // enters when ref is set by attaching to a component
      if (component) {
        tag.value = isFabric
          ? (component as any)._internalInstanceHandle.stateNode.node
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
