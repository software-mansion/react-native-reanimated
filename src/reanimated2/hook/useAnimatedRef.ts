import type { Component } from 'react';
import { useRef } from 'react';
import { useSharedValue } from './useSharedValue';
import type { AnimatedRef } from './commonTypes';
import type { ShadowNodeWrapper } from '../commonTypes';
import {
  makeShareableCloneRecursive,
  registerShareableMapping,
} from '../shareables';
import { findNodeHandle } from 'react-native';

type Nullable<T> = T | undefined | null;
interface MaybeScrollableComponent extends Component {
  getNativeScrollRef?: () => Nullable<MaybeScrollableComponent>;
  getScrollableNode?: () => Nullable<MaybeScrollableComponent>;
}

function getComponentOrScrollable(
  component: MaybeScrollableComponent
): Nullable<MaybeScrollableComponent> {
  if (global._IS_FABRIC && component.getNativeScrollRef) {
    return component.getNativeScrollRef();
  } else if (!global._IS_FABRIC && component.getScrollableNode) {
    return component.getScrollableNode();
  }
  return component;
}

// const getTagValueFunction = global._IS_FABRIC
//   ? getShadowNodeWrapperFromRef
//   : findNodeHandle;

const getTagValueFunction = findNodeHandle;

export function useAnimatedRef<
  T extends MaybeScrollableComponent
>(): AnimatedRef<T> {
  const tag = useSharedValue<number | ShadowNodeWrapper | null>(-1);
  const ref = useRef<AnimatedRef<T>>();

  if (!ref.current) {
    const fun: AnimatedRef<T> = <AnimatedRef<T>>((component) => {
      // enters when ref is set by attaching to a component
      if (component) {
        // On Fabric we use getNativeScrollRef which can return undefined
        // but on Paper getTagValueFunction is 'findNodeHandle' which cannot
        // get undefined. It's hard to solve this in TypeScript so we can just
        // use !.
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        tag.value = getTagValueFunction(getComponentOrScrollable(component)!);
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
