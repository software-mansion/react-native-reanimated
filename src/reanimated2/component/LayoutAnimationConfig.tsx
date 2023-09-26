'use strict';
import { Children, Component, createContext, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { setShouldAnimateExitingForTag } from '../core';
import { findNodeHandle } from 'react-native';

export const SkipEnteringContext =
  createContext<React.MutableRefObject<boolean> | null>(null);

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
    <SkipEnteringContext.Provider value={skipValueRef}>
      {props.children}
    </SkipEnteringContext.Provider>
  );
}

// skipExiting (unlike skipEntering) cannot be done by conditionally
// configuring the animation in `createAnimatedComponent`, since at this stage
// we don't know if the wrapper is going to be unmounted or not.
// That's why we need to pass the skipExiting flag to the native side
// when the wrapper is unmounted to prevent the animation.
// Since `ReactNode` can be a list of nodes, we wrap every child with our wrapper
// so we are able to access its tag with `findNodeHandle`.
export class LayoutAnimationConfig extends Component<LayoutAnimationConfigProps> {
  componentWillUnmount(): void {
    if (
      this.props.skipExiting !== undefined &&
      Children.count(this.props.children) === 1
    ) {
      const tag = findNodeHandle(this);
      if (tag) {
        setShouldAnimateExitingForTag(tag, !this.props.skipExiting);
      }
    }
  }

  render(): ReactNode {
    const children =
      Children.count(this.props.children) > 1 && this.props.skipExiting
        ? Children.map(this.props.children, (child) => (
            <LayoutAnimationConfig skipExiting>{child}</LayoutAnimationConfig>
          ))
        : this.props.children;

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
