'use strict';
import type {
  ComponentClass,
  ComponentType,
  FunctionComponent,
  Ref,
} from 'react';
import React from 'react';
import type { FlatList, FlatListProps } from 'react-native';

import type { CSSProps } from '../types';
import type { AnimatedComponentProps } from './AnimatedComponent';
import AnimatedComponentImpl from './AnimatedComponent';

// Don't change the order of overloads, since such a change breaks current behavior
export default function createAnimatedComponent<P extends object>(
  Component: FunctionComponent<P>
): FunctionComponent<CSSProps<P>>;

export default function createAnimatedComponent<P extends object>(
  Component: ComponentClass<P>
): ComponentClass<CSSProps<P>>;

export default function createAnimatedComponent<P extends object>(
  // Actually ComponentType<P = {}> = ComponentClass<P> | FunctionComponent<P> but we need this overload too
  // since some external components (like FastImage) are typed just as ComponentType
  Component: ComponentType<P>
): FunctionComponent<CSSProps<P>> | ComponentClass<CSSProps<P>>;

/**
 * @deprecated Please use `Animated.FlatList` component instead of calling
 *   `Animated.createAnimatedComponent(FlatList)` manually.
 */
// @ts-ignore This is required to create this overload, since type of createAnimatedComponent is incorrect and doesn't include typeof FlatList
export default function createAnimatedComponent(
  Component: typeof FlatList<unknown>
): ComponentClass<CSSProps<FlatListProps<unknown>>>;

export default function createAnimatedComponent<P extends object>(
  Component: ComponentType<P>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any {
  class AnimatedComponent extends AnimatedComponentImpl {
    static displayName = `AnimatedComponent(${
      Component.displayName || Component.name || 'Component'
    })`;

    constructor(props: AnimatedComponentProps) {
      super(Component, props);
    }
  }

  const animatedComponent = (
    props: AnimatedComponentProps & { ref: Ref<AnimatedComponent> }
  ) => {
    return (
      <AnimatedComponent
        {...props}
        // Needed to prevent react from signing AnimatedComponent to the ref
        // (we want to handle the ref assignment in the AnimatedComponent)
        ref={null}
        {...(props.ref === null ? null : { forwardedRef: props.ref })}
      />
    );
  };

  animatedComponent.displayName =
    Component.displayName || Component.name || 'Component';

  return animatedComponent;
}
