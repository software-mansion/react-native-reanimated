'use strict';

import { Children, Component, createContext, useEffect, useRef } from 'react';
import { setShouldAnimateExitingForTag } from '../core';
import { findNodeHandle } from '../platformFunctions/findNodeHandle';
import { jsx as _jsx } from "react/jsx-runtime";
export const SkipEnteringContext = /*#__PURE__*/createContext(null);

// skipEntering - don't animate entering of children on wrapper mount
// skipExiting - don't animate exiting of children on wrapper unmount

function SkipEntering(props) {
  const skipValueRef = useRef(props.shouldSkip);
  useEffect(() => {
    skipValueRef.current = false;
  }, [skipValueRef]);
  return /*#__PURE__*/_jsx(SkipEnteringContext, {
    value: skipValueRef,
    children: props.children
  });
}

// skipExiting (unlike skipEntering) cannot be done by conditionally
// configuring the animation in `createAnimatedComponent`, since at this stage
// we don't know if the wrapper is going to be unmounted or not.
// That's why we need to pass the skipExiting flag to the native side
// when the wrapper is unmounted to prevent the animation.
// Since `ReactNode` can be a list of nodes, we wrap every child with our wrapper
// so we are able to access its tag with `findNodeHandle`.
/**
 * A component that lets you skip entering and exiting animations.
 *
 * @param skipEntering - A boolean indicating whether children's entering
 *   animations should be skipped when `LayoutAnimationConfig` is mounted.
 * @param skipExiting - A boolean indicating whether children's exiting
 *   animations should be skipped when LayoutAnimationConfig is unmounted.
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/layout-animation-config/
 */
export class LayoutAnimationConfig extends Component {
  getMaybeWrappedChildren() {
    return Children.count(this.props.children) > 1 && this.props.skipExiting ? Children.map(this.props.children, child => /*#__PURE__*/_jsx(LayoutAnimationConfig, {
      skipExiting: true,
      children: child
    })) : this.props.children;
  }
  setShouldAnimateExiting() {
    if (Children.count(this.props.children) === 1) {
      const tag = findNodeHandle(this);
      if (tag) {
        setShouldAnimateExitingForTag(tag, !this.props.skipExiting);
      }
    }
  }
  componentWillUnmount() {
    if (this.props.skipExiting !== undefined) {
      this.setShouldAnimateExiting();
    }
  }
  render() {
    const children = this.getMaybeWrappedChildren();
    if (this.props.skipEntering === undefined) {
      return children;
    }
    return /*#__PURE__*/_jsx(SkipEntering, {
      shouldSkip: this.props.skipEntering,
      children: children
    });
  }
}
//# sourceMappingURL=LayoutAnimationConfig.js.map