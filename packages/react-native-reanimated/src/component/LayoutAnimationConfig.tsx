'use strict';
import type { ReactNode, Ref, RefCallback } from 'react';
import {
  Children,
  cloneElement,
  Component,
  createContext,
  Fragment,
  isValidElement,
  useContext,
  useEffect,
  useRef,
} from 'react';

import { setShouldAnimateExitingForTag } from '../core';
import type { InstanceWithViewTag } from '../createAnimatedComponent/getViewInfo';
import { getViewTagFromInstance } from '../createAnimatedComponent/getViewInfo';
import { findNodeHandle } from '../platformFunctions/findNodeHandle';
import { mergeRefs } from '../reactUtils';

export const SkipEnteringContext =
  createContext<React.RefObject<boolean> | null>(null);

// skipEntering - don't animate entering of children on wrapper mount
// skipExiting - don't animate exiting of children on wrapper unmount
interface LayoutAnimationConfigProps {
  skipEntering?: boolean;
  skipExiting?: boolean;
  children: ReactNode;
}

function SkipEntering(props: {
  shouldSkip: boolean | undefined;
  children: ReactNode;
}) {
  const inheritedSkipValueRef = useContext(SkipEnteringContext);
  const skipValueRef = useRef(props.shouldSkip === true);

  useEffect(() => {
    skipValueRef.current = false;
  }, [skipValueRef]);

  return (
    <SkipEnteringContext
      value={
        props.shouldSkip === undefined ? inheritedSkipValueRef : skipValueRef
      }>
      {props.children}
    </SkipEnteringContext>
  );
}

// React reconciles an array or any other iterable as a keyed list of children.
function isChildList(children: ReactNode): children is Iterable<ReactNode> {
  return (
    typeof children === 'object' &&
    children !== null &&
    Symbol.iterator in children
  );
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
export class LayoutAnimationConfig extends Component<LayoutAnimationConfigProps> {
  _childInstance: InstanceWithViewTag | null = null;
  _mergedRef?: RefCallback<InstanceWithViewTag>;
  _mergedRefSource?: Ref<InstanceWithViewTag>;

  _setChildInstance = (instance: InstanceWithViewTag | null) => {
    this._childInstance = instance;
  };

  _getMergedRef(childRef: Ref<InstanceWithViewTag> | undefined) {
    if (!this._mergedRef || this._mergedRefSource !== childRef) {
      this._mergedRefSource = childRef;
      this._mergedRef = mergeRefs(childRef, this._setChildInstance);
    }
    return this._mergedRef;
  }

  getComponentViewTag() {
    return getViewTagFromInstance(this._childInstance) ?? -1;
  }

  getMaybeWrappedChildren() {
    const { children, skipExiting } = this.props;

    if (!isChildList(children)) {
      return this.getMaybeRefTrackedChild();
    }

    // The only child of a list is marked by `setShouldAnimateExiting` instead.
    const skipEachChildExiting =
      skipExiting && Children.count(children) > 1 ? true : undefined;

    return Children.map(children, (child) => (
      <LayoutAnimationConfig skipExiting={skipEachChildExiting}>
        {child}
      </LayoutAnimationConfig>
    ));
  }

  getMaybeRefTrackedChild() {
    const { children } = this.props;

    if (
      this.props.skipExiting === undefined ||
      !isValidElement<{ ref?: Ref<InstanceWithViewTag> }>(children) ||
      children.type === Fragment
    ) {
      return children;
    }

    return cloneElement(children, {
      ref: this._getMergedRef(children.props.ref),
    });
  }

  setShouldAnimateExiting() {
    if (Children.count(this.props.children) === 1) {
      const tag =
        getViewTagFromInstance(this._childInstance) ?? findNodeHandle(this);
      if (tag) {
        setShouldAnimateExitingForTag(tag, !this.props.skipExiting);
      }
    }
  }

  componentWillUnmount(): void {
    if (this.props.skipExiting !== undefined) {
      this.setShouldAnimateExiting();
    }
  }

  render(): ReactNode {
    return (
      <SkipEntering shouldSkip={this.props.skipEntering}>
        {this.getMaybeWrappedChildren()}
      </SkipEntering>
    );
  }
}
