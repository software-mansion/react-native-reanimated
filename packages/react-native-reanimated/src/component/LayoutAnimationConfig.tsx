'use strict';
import type { ReactNode } from 'react';
import React, {
  Children,
  Component,
  createContext,
  useEffect,
  useRef,
} from 'react';

import { setShouldAnimateExitingForSubtree } from '../core';
import { findNodeHandle } from '../platformFunctions/findNodeHandle';
import { View } from 'react-native';

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
  setShouldAnimateExiting(shouldAnimate: boolean) {
    if (Children.count(this.props.children) === 1) {
      const rootTag = findNodeHandle(this);
      console.log('rootTag', rootTag);
      if (rootTag) {
        setShouldAnimateExitingForSubtree(rootTag, shouldAnimate);
      }
    }
  }

  componentDidMount(): void {
    if (this.props.skipExiting) {
      this.setShouldAnimateExiting(false);
    }
  }

  shouldComponentUpdate(
    nextProps: Readonly<LayoutAnimationConfigProps>
  ): boolean {
    if (nextProps.skipExiting !== this.props.skipExiting) {
      this.setShouldAnimateExiting(!nextProps.skipExiting);
    }

    return true;
  }

  render(): ReactNode {
    if (this.props.skipEntering === undefined) {
      return (
        <View style={{ backgroundColor: 'blue', padding: 10 }}>
          {this.props.children}
        </View>
      );
    }

    return (
      <SkipEntering shouldSkip={this.props.skipEntering}>
        <View style={{ backgroundColor: 'blue', padding: 10 }}>
          {this.props.children}
        </View>
      </SkipEntering>
    );
  }
}
