'use strict';

import React from 'react';
import AnimatedComponentImpl from './AnimatedComponent';

// eslint-disable-next-line @typescript-eslint/no-explicit-any

/**
 * Lets you create an Animated version of any React Native component.
 *
 * @param component - The component you want to make animatable.
 * @returns A component that Reanimated is capable of animating.
 * @see https://docs.swmansion.com/react-native-reanimated/docs/core/createAnimatedComponent
 */

// Don't change the order of overloads, since such a change breaks current behavior

/**
 * @deprecated Please use `Animated.FlatList` component instead of calling
 *   `Animated.createAnimatedComponent(FlatList)` manually.
 */
// @ts-ignore This is required to create this overload, since type of createAnimatedComponent is incorrect and doesn't include typeof FlatList
import { jsx as _jsx } from "react/jsx-runtime";
export function createAnimatedComponent(Component, options) {
  class AnimatedComponent extends AnimatedComponentImpl {
    static displayName = `AnimatedComponent(${Component.displayName || Component.name || 'Component'})`;
    constructor(props) {
      // User can override component-defined jsProps via options
      const jsProps = options?.jsProps ?? Component.jsProps;
      const modifiedOptions = jsProps?.length ? {
        ...options,
        jsProps
      } : options;
      super(Component, props, AnimatedComponent.displayName, modifiedOptions);
    }
  }
  const animatedComponent = props => {
    return /*#__PURE__*/_jsx(AnimatedComponent, {
      ...props,
      // Needed to prevent react from signing AnimatedComponent to the ref
      // (we want to handle the ref assignment in the AnimatedComponent)
      ref: null,
      ...(props.ref === null ? null : {
        forwardedRef: props.ref
      })
    });
  };
  animatedComponent.displayName = Component.displayName || Component.name || 'Component';
  return animatedComponent;
}
//# sourceMappingURL=createAnimatedComponent.js.map