'use strict';
import type { ComponentRef, ComponentType, ReactNode, Ref } from 'react';
import type React from 'react';
import type { FlatList, FlatListProps } from 'react-native';

import type { AnyRecord } from '../common';
import type { InstanceOrElement } from '../commonTypes';
import type { AnimatedProps } from '../helperTypes';
import type { AnimatedRef } from '../hook';
import type { ExtractElementRef } from '../hook/commonTypes';
import type { Options } from './AnimatedComponent';
import AnimatedComponentImpl from './AnimatedComponent';
import type {
  AnimatedComponentProps,
  InitialComponentProps,
} from './commonTypes';

type AnimatedComponentRef<TInstance> =
  | Ref<ExtractElementRef<TInstance>>
  | (TInstance extends InstanceOrElement ? AnimatedRef<TInstance> : never)
  // Accept untyped AnimatedRef as well to allow passing a reference created
  // with the useAnimatedRef hook call without specifying the type
  | AnimatedRef;

export type AnimatedComponentType<
  Props extends AnyRecord = object,
  Instance = unknown,
> = (
  props: Omit<AnimatedProps<Props>, 'ref'> & {
    ref?: AnimatedComponentRef<Instance>;
  }
) => ReactNode;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnimatableComponent<C extends ComponentType<any>> = C & {
  jsProps?: string[];
};

/**
 * @deprecated Please use `Animated.FlatList` component instead of calling
 *   `Animated.createAnimatedComponent(FlatList)` manually.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createAnimatedComponent<T = any>(
  Component: typeof FlatList<T>,
  options?: Options<InitialComponentProps>
): AnimatedComponentType<
  Readonly<FlatListProps<T>>,
  ComponentRef<typeof FlatList<T>>
>;

/**
 * Lets you create an Animated version of any React Native component.
 *
 * @param Component - The component you want to make animatable.
 * @param options - Optional configuration object containing:
 *
 *   - `setNativeProps`: Function to set native props
 *   - `jsProps`: String array to select which props should be animated on JS
 *
 * @returns A component that Reanimated is capable of animating.
 * @see https://docs.swmansion.com/react-native-reanimated/docs/core/createAnimatedComponent
 */
export function createAnimatedComponent<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TInstance extends AnimatableComponent<ComponentType<any>>,
>(
  Component: TInstance,
  options?: Options<InitialComponentProps>
): AnimatedComponentType<Readonly<React.ComponentProps<TInstance>>, TInstance>;

export function createAnimatedComponent<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TInstance extends AnimatableComponent<ComponentType<any>>,
>(
  Component: TInstance,
  options?: Options<InitialComponentProps>
): AnimatedComponentType<Readonly<React.ComponentProps<TInstance>>, TInstance> {
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
    props: Omit<AnimatedProps<React.ComponentProps<TInstance>>, 'ref'> & {
      ref?: AnimatedComponentRef<TInstance>;
    }
  ) => (
    <AnimatedComponent
      // TODO - fix broken reanimated types and remove type duplicates
      {...(props as AnimatedComponentProps<InitialComponentProps>)}
      // Needed to prevent react from signing AnimatedComponent to the ref
      // (we want to handle the ref assignment in the AnimatedComponent)
      ref={null}
      {...(props.ref === null ? null : { forwardedRef: props.ref })}
    />
  );

  animatedComponent.displayName =
    Component.displayName || Component.name || 'Component';

  return animatedComponent;
}
