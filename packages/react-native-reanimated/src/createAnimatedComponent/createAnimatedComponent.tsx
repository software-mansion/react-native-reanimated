'use strict';
import type {
  Component,
  ComponentClass,
  ComponentType,
  FunctionComponent,
} from 'react';
import React from 'react';
import type { FlatList, FlatListProps } from 'react-native';

import type { AnimateProps } from '../helperTypes';
import type { Options } from './AnimatedComponent';
import AnimatedComponentImpl from './AnimatedComponent';
import type {
  AnimatedComponentProps,
  InitialComponentProps,
} from './commonTypes';

/**
 * Lets you create an Animated version of any React Native component.
 *
 * @param component - The component you want to make animatable.
 * @returns A component that Reanimated is capable of animating.
 * @see https://docs.swmansion.com/react-native-reanimated/docs/core/createAnimatedComponent
 */

// Don't change the order of overloads, since such a change breaks current behavior
export function createAnimatedComponent<P extends object>(
  component: FunctionComponent<P>,
  options?: Options<P>
): FunctionComponent<AnimateProps<P>>;

export function createAnimatedComponent<P extends object>(
  component: ComponentClass<P>,
  options?: Options<P>
): ComponentClass<AnimateProps<P>>;

export function createAnimatedComponent<P extends object>(
  // Actually ComponentType<P = {}> = ComponentClass<P> | FunctionComponent<P> but we need this overload too
  // since some external components (like FastImage) are typed just as ComponentType
  component: ComponentType<P>,
  options?: Options<P>
): FunctionComponent<AnimateProps<P>> | ComponentClass<AnimateProps<P>>;

/**
 * @deprecated Please use `Animated.FlatList` component instead of calling
 *   `Animated.createAnimatedComponent(FlatList)` manually.
 */
// @ts-ignore This is required to create this overload, since type of createAnimatedComponent is incorrect and doesn't include typeof FlatList
export function createAnimatedComponent(
  component: typeof FlatList<unknown>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  options?: Options<any>
): ComponentClass<AnimateProps<FlatListProps<unknown>>>;

export function createAnimatedComponent(
  Component: ComponentType<InitialComponentProps>,
  options?: Options<InitialComponentProps>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any {
  class AnimatedComponent extends AnimatedComponentImpl {
    static displayName = `AnimatedComponent(${
      Component.displayName || Component.name || 'Component'
    })`;

    constructor(props: AnimatedComponentProps<InitialComponentProps>) {
      super(Component, props, AnimatedComponent.displayName, options);
    }
  }

  const animatedComponent = ({
    ref,
    ...props
  }: {
    ref: React.Ref<Component>;
    props: AnimatedComponentProps<InitialComponentProps>;
  }) => {
    return (
      <AnimatedComponent
        {...props}
        {...(ref === null ? null : { forwardedRef: ref })}
      />
    );
  };

  animatedComponent.displayName =
    Component.displayName || Component.name || 'Component';

  return animatedComponent;
}
