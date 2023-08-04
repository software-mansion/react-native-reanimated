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
import { findNodeHandle } from 'react-native';
import type { FlatList, ScrollView, SectionList } from 'react-native';
interface MaybeScrollableComponent extends Component {
  getNativeScrollRef?: FlatList['getNativeScrollRef'];
  getScrollableNode?:
    | FlatList['getScrollableNode']
    | ScrollView['getScrollableNode']
    | SectionList['getScrollableNode'];
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
  const ref = useRef<AnimatedRef<T>>();

  if (!ref.current) {
    const fun: AnimatedRef<T> = <AnimatedRef<T>>((component) => {
      // enters when ref is set by attaching to a component
      if (component) {
        tag.value = getTagValueFunction(getComponentOrScrollable(component));
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
