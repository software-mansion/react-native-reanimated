'use strict';
import type {
  ComponentClass,
  ComponentType,
  FunctionComponent,
  Ref,
} from 'react';
import React from 'react';
import type { FlatList, FlatListProps } from 'react-native';

import type { AnimatedProps } from '../helperTypes';
import type { Options } from './AnimatedComponent';
import AnimatedComponentImpl from './AnimatedComponent';
import type {
  AnimatedComponentProps,
  InitialComponentProps,
} from './commonTypes';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnimatableComponent<C extends ComponentType<any>> = C & {
  jsProps?: string[];
};

/**
 * Lets you create an Animated version of any React Native component.
 *
 * @param component - The component you want to make animatable.
 * @returns A component that Reanimated is capable of animating.
 * @see https://docs.swmansion.com/react-native-reanimated/docs/core/createAnimatedComponent
 */

// Don't change the order of overloads, since such a change breaks current behavior
export function createAnimatedComponent<P extends object>(
  component: AnimatableComponent<FunctionComponent<P>>,
  options?: Options<P>
): FunctionComponent<AnimatedProps<P>>;

export function createAnimatedComponent<P extends object>(
  component: AnimatableComponent<ComponentClass<P>>,
  options?: Options<P>
): ComponentClass<AnimatedProps<P>>;

export function createAnimatedComponent<P extends object>(
  // Actually ComponentType<P = {}> = ComponentClass<P> | FunctionComponent<P> but we need this overload too
  // since some external components (like FastImage) are typed just as ComponentType
  component: AnimatableComponent<ComponentType<P>>,
  options?: Options<P>
): FunctionComponent<AnimatedProps<P>> | ComponentClass<AnimatedProps<P>>;

/**
 * @deprecated Please use `Animated.FlatList` component instead of calling
 *   `Animated.createAnimatedComponent(FlatList)` manually.
 */
// @ts-ignore This is required to create this overload, since type of createAnimatedComponent is incorrect and doesn't include typeof FlatList
export function createAnimatedComponent(
  component: AnimatableComponent<typeof FlatList<unknown>>,
  options?: Options<typeof FlatList<unknown>>
): ComponentClass<AnimatedProps<FlatListProps<unknown>>>;

export function createAnimatedComponent(
  Component: AnimatableComponent<ComponentType<InitialComponentProps>>,
  options?: Options<InitialComponentProps>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any {
  class AnimatedComponent extends AnimatedComponentImpl {
    static displayName = `AnimatedComponent(${
      Component.displayName || Component.name || 'Component'
    })`;

    constructor(props: AnimatedComponentProps<InitialComponentProps>) {
      // User can override component-defined jsProps via options
      const jsProps = options?.jsProps ?? Component.jsProps;
      const modifiedOptions = jsProps?.length
        ? { ...options, jsProps }
        : options;
      super(Component, props, AnimatedComponent.displayName, modifiedOptions);
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
