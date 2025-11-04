'use strict';
import type { ComponentRef, ComponentType, ReactNode, Ref } from 'react';
import type React from 'react';
import type { FlatList, FlatListProps } from 'react-native';

import type { AnyRecord } from '../../common';
import type { InitialComponentProps } from '../../createAnimatedComponent/commonTypes';
import type { AnimatedProps } from '../../helperTypes';
import type { AnimatedRef } from '../../hook';
import type { CSSProps } from '../types';
import type { AnimatedComponentProps } from './AnimatedComponent';
import AnimatedComponentImpl from './AnimatedComponent';

type AnimatedComponentType<
  Props extends AnyRecord = object,
  Instance = unknown,
> = (
  props: Omit<CSSProps<Props>, 'ref'> & {
    // Accept untyped AnimatedRef as well to allow passing a reference created
    // with the useAnimatedRef hook call without specifying the type
    ref?: Ref<Instance> | AnimatedRef;
  }
) => ReactNode;

/**
 * @deprecated Please use `Animated.FlatList` component instead of calling
 *   `Animated.createAnimatedComponent(FlatList)` manually.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createAnimatedComponent<T = any>(
  Component: typeof FlatList<T>
): AnimatedComponentType<
  Readonly<FlatListProps<T>>,
  ComponentRef<typeof FlatList<T>>
>;

/**
 * Lets you create an Animated version of any React Native component.
 *
 * @param Component - The component you want to make animatable.
 * @returns A component that Reanimated is capable of animating.
 * @see https://docs.swmansion.com/react-native-reanimated/docs/core/createAnimatedComponent
 */
export function createAnimatedComponent<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TInstance extends ComponentType<any>,
>(
  Component: TInstance
): AnimatedComponentType<
  Readonly<React.ComponentProps<TInstance>>,
  ComponentRef<TInstance>
>;

export function createAnimatedComponent<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TInstance extends ComponentType<any>,
>(
  Component: TInstance
): AnimatedComponentType<
  Readonly<React.ComponentProps<TInstance>>,
  ComponentRef<TInstance>
> {
  class AnimatedComponent extends AnimatedComponentImpl {
    static displayName = `AnimatedComponent(${
      Component.displayName || Component.name || 'Component'
    })`;

    constructor(props: AnimatedComponentProps) {
      super(Component, props);
    }
  }

  const animatedComponent = (
    props: AnimatedProps<InitialComponentProps> & {
      ref?: Ref<ComponentRef<TInstance>> | AnimatedRef;
    }
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
