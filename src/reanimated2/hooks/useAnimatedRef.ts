import { useRef } from 'react';
import { getTag } from '../NativeMethods';
import { useSharedValue } from './useSharedValue';

export function useAnimatedRef() {
  const tag = useSharedValue(-1);
  const ref = useRef(null);

  if (!ref.current) {
    const fun = function (component) {
      'worklet';
      // enters when ref is set by attaching to a component
      if (component) {
        tag.value = getTag(component);
        fun.current = component;
      }
      return tag.value;
    };

    Object.defineProperty(fun, 'current', {
      value: null,
      writable: true,
      enumerable: false,
    });
    ref.current = fun;
  }

  return ref.current;
}
