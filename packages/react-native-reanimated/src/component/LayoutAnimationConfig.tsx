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

interface LayoutAnimationConfigChildProps {
  trackedChildren: Set<LayoutAnimationConfigChild>;
  tracksRef: boolean;
  children: ReactNode;
}

// One child of a `LayoutAnimationConfig`, which the config marks when it
// unmounts. Its own unmount, when only this child is removed, marks nothing.
class LayoutAnimationConfigChild extends Component<LayoutAnimationConfigChildProps> {
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

  getChildViewTag() {
    return getViewTagFromInstance(this._childInstance);
  }

  getViewTag() {
    return this.getChildViewTag() ?? findNodeHandle(this);
  }

  componentDidMount(): void {
    this.props.trackedChildren.add(this);
  }

  componentWillUnmount(): void {
    this.props.trackedChildren.delete(this);
  }

  render(): ReactNode {
    const { children, tracksRef } = this.props;

    if (
      !tracksRef ||
      !isValidElement<{ ref?: Ref<InstanceWithViewTag> }>(children) ||
      children.type === Fragment
    ) {
      return children;
    }

    return cloneElement(children, {
      ref: this._getMergedRef(children.props.ref),
    });
  }
}

// skipExiting (unlike skipEntering) cannot be done by conditionally
// configuring the animation in `createAnimatedComponent`, since at this stage
// we don't know if the wrapper is going to be unmounted or not.
// That's why we need to pass the skipExiting flag to the native side
// when the wrapper is unmounted to prevent the animation.
// Since `ReactNode` can be a list of nodes, every child is rendered through a
// `LayoutAnimationConfigChild`, which gives the config access to its tag.
// React unmounts a class component before its children, so the config reads
// every tag before any child is gone.
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
  _trackedChildren = new Set<LayoutAnimationConfigChild>();

  getComponentViewTag() {
    if (this._trackedChildren.size !== 1) {
      return -1;
    }
    const [onlyChild] = this._trackedChildren;
    return onlyChild.getChildViewTag() ?? -1;
  }

  setShouldAnimateExiting() {
    for (const trackedChild of this._trackedChildren) {
      const tag = trackedChild.getViewTag();
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
    const { children, skipEntering, skipExiting } = this.props;

    return (
      <SkipEntering shouldSkip={skipEntering}>
        {Children.map(children, (child) =>
          child === null ? null : (
            <LayoutAnimationConfigChild
              trackedChildren={this._trackedChildren}
              tracksRef={skipExiting !== undefined}>
              {child}
            </LayoutAnimationConfigChild>
          )
        )}
      </SkipEntering>
    );
  }
}
