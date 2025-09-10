'use strict';

import React from 'react';
import AnimatedComponentImpl from "./AnimatedComponent.js";

// Don't change the order of overloads, since such a change breaks current behavior

/**
 * @deprecated Please use `Animated.FlatList` component instead of calling
 *   `Animated.createAnimatedComponent(FlatList)` manually.
 */
// @ts-ignore This is required to create this overload, since type of createAnimatedComponent is incorrect and doesn't include typeof FlatList

export default function createAnimatedComponent(Component) {
  class AnimatedComponent extends AnimatedComponentImpl {
    static displayName = `AnimatedComponent(${Component.displayName || Component.name || 'Component'})`;
    constructor(props) {
      super(Component, props);
    }
  }
  const animatedComponent = props => {
    return <AnimatedComponent {...props}
    // Needed to prevent react from signing AnimatedComponent to the ref
    // (we want to handle the ref assignment in the AnimatedComponent)
    ref={null} {...props.ref === null ? null : {
      forwardedRef: props.ref
    }} />;
  };
  animatedComponent.displayName = Component.displayName || Component.name || 'Component';
  return animatedComponent;
}
//# sourceMappingURL=createAnimatedComponent.js.map