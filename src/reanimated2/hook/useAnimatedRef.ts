import { Component, useRef } from 'react';
import { useSharedValue } from './useSharedValue';
import { RefObjectFunction } from './commonTypes';
import { ShadowNodeWrapper } from '../commonTypes';
import { getShadowNodeWrapperFromRef } from '../fabricUtils';
import {
  makeShareableCloneRecursive,
  registerShareableMapping,
} from '../shareables';
import { Platform, findNodeHandle } from 'react-native';

interface ComponentRef extends Component {
  getNativeScrollRef?: () => ComponentRef;
  getScrollableNode?: () => ComponentRef;
  viewConfig?: {
    uiViewClassName?: string;
  };
}

function getComponentOrScrollableRef(component: ComponentRef): ComponentRef {
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

export function useAnimatedRef<T extends ComponentRef>(): RefObjectFunction<T> {
  const tag = useSharedValue<number | ShadowNodeWrapper | null>(-1);
  const viewName = useSharedValue<string | null>(null);

  const ref = useRef<RefObjectFunction<T>>();

  if (!ref.current) {
    const fun: RefObjectFunction<T> = <RefObjectFunction<T>>((component) => {
      // enters when ref is set by attaching to a component
      if (component) {
        tag.value = getTagValueFunction(getComponentOrScrollableRef(component));
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
