'use strict';
import type { ReactNode, Ref, RefCallback } from 'react';
import {
  Children,
  cloneElement,
  Component,
  createContext,
  isValidElement,
  useEffect,
  useRef,
} from 'react';

import { setShouldAnimateExitingForTag } from '../core';
import { findNodeHandle } from '../platformFunctions/findNodeHandle';

export const SkipEnteringContext =
  createContext<React.RefObject<boolean> | null>(null);

// skipEntering - don't animate entering of children on wrapper mount
// skipExiting - don't animate exiting of children on wrapper unmount
interface LayoutAnimationConfigProps {
  skipEntering?: boolean;
  skipExiting?: boolean;
  children: ReactNode;
}

function SkipEntering(props: { shouldSkip: boolean; children: ReactNode }) {
  const skipValueRef = useRef(props.shouldSkip);

  useEffect(() => {
    skipValueRef.current = false;
  }, [skipValueRef]);

  return (
    <SkipEnteringContext value={skipValueRef}>
      {props.children}
    </SkipEnteringContext>
  );
}

type TaggedInstance = {
  getComponentViewTag?: () => number;
  __nativeTag?: number;
  getNativeScrollRef?: () => TaggedInstance | null;
  getScrollableNode?: () => TaggedInstance | number | null;
};

function getTagFromChildInstance(
  instance: TaggedInstance | null
): number | null {
  if (!instance) {
    return null;
  }

  if (typeof instance.getComponentViewTag === 'function') {
    const tag = instance.getComponentViewTag();
    if (tag !== -1) {
      return tag;
    }
  }

  if (typeof instance.__nativeTag === 'number') {
    return instance.__nativeTag;
  }

  const nativeScrollRef = instance.getNativeScrollRef?.();
  if (typeof nativeScrollRef?.__nativeTag === 'number') {
    return nativeScrollRef.__nativeTag;
  }

  const scrollableNode = instance.getScrollableNode?.();
  if (typeof scrollableNode === 'number') {
    return scrollableNode;
  }
  if (typeof scrollableNode?.__nativeTag === 'number') {
    return scrollableNode.__nativeTag;
  }

  return null;
}

function mergeRefs<T>(...refs: (Ref<T> | undefined)[]): RefCallback<T> {
  return (instance: T | null) => {
    const cleanups = refs.map((ref) => {
      if (typeof ref === 'function') {
        const cleanup = ref(instance);
        return typeof cleanup === 'function' ? cleanup : () => ref(null);
      }
      if (ref) {
        ref.current = instance;
        return () => {
          ref.current = null;
        };
      }
      return undefined;
    });

    return () => cleanups.forEach((cleanup) => cleanup?.());
  };
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
  _childInstance: TaggedInstance | null = null;
  _mergedRef?: RefCallback<TaggedInstance>;
  _mergedRefSource?: Ref<TaggedInstance>;

  _setChildInstance = (instance: TaggedInstance | null) => {
    this._childInstance = instance;
  };

  _getMergedRef(childRef: Ref<TaggedInstance> | undefined) {
    if (!this._mergedRef || this._mergedRefSource !== childRef) {
      this._mergedRefSource = childRef;
      this._mergedRef = mergeRefs(childRef, this._setChildInstance);
    }
    return this._mergedRef;
  }

  getComponentViewTag() {
    return getTagFromChildInstance(this._childInstance) ?? -1;
  }

  getMaybeWrappedChildren() {
    return Children.count(this.props.children) > 1 && this.props.skipExiting
      ? Children.map(this.props.children, (child) => (
          <LayoutAnimationConfig skipExiting>{child}</LayoutAnimationConfig>
        ))
      : this.getMaybeRefTrackedChild();
  }

  getMaybeRefTrackedChild() {
    const { children } = this.props;

    if (
      this.props.skipExiting === undefined ||
      Children.count(children) !== 1
    ) {
      return children;
    }

    const child = Children.only(children);
    if (!isValidElement<{ ref?: Ref<TaggedInstance> }>(child)) {
      return children;
    }

    return cloneElement(child, {
      ref: this._getMergedRef(child.props.ref),
    });
  }

  setShouldAnimateExiting() {
    if (Children.count(this.props.children) === 1) {
      const tag =
        getTagFromChildInstance(this._childInstance) ?? findNodeHandle(this);
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
    const children = this.getMaybeWrappedChildren();

    if (this.props.skipEntering === undefined) {
      return children;
    }

    return (
      <SkipEntering shouldSkip={this.props.skipEntering}>
        {children}
      </SkipEntering>
    );
  }
}
