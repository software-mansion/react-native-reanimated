'use strict';
import type {
  ComponentProps,
  ComponentRef,
  ComponentType,
  ReactNode,
  Ref,
  RefAttributes,
} from 'react';
import type { FlatList, FlatListProps, TextInput } from 'react-native';

import type {
  InstanceOrElement,
  SharedValueDisableContravariance,
} from '../commonTypes';
import type { CSSCallbackProps } from '../css/types';
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
  Props extends object = object,
  Instance = unknown,
  // Extra props accepted only when passed inline on the animated component.
  // They are not part of the base component props, so they don't affect the
  // `animatedProps` typing.
  ExtraProps extends object = object,
> = {
  (
    props: Omit<AnimatedProps<Props>, 'ref'> &
      CSSCallbackProps &
      ExtraProps & {
        ref?: AnimatedComponentRef<Instance>;
      }
  ): ReactNode;
  (
    props: Omit<AnimatedProps<Props>, 'ref'> &
      CSSCallbackProps &
      ExtraProps &
      RefAttributes<ExtractElementRef<Instance>>
  ): ReactNode;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnimatableComponent<C extends ComponentType<any>> = C & {
  jsProps?: string[];
};

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
  // `FlatList` and `TextInput` are excluded so that calls passing them fall
  // through to the dedicated overloads below. This overload is declared first
  // so that a bare reference to `createAnimatedComponent` (e.g.
  // `Animated.createAnimatedComponent` passed as a value) resolves to a
  // non-deprecated signature instead of being falsely flagged by
  // `@typescript-eslint/no-deprecated`.
  Component: TInstance extends typeof FlatList<infer _> | typeof TextInput
    ? never
    : TInstance,
  options?: Options<InitialComponentProps>
): AnimatedComponentType<Readonly<ComponentProps<TInstance>>, TInstance>;

/**
 * `text` is the native prop backing `TextInput`'s value. It's not part of
 * `TextInputProps`, but Reanimated can update it directly, so the animated
 * `TextInput` accepts it as a shared value. Static strings are still disallowed
 * - use `value` or `defaultValue` for those. It's added only to the inline
 * props (not to the base component props) so that `useAnimatedProps`, which
 * supplies raw values, keeps accepting `{ text: string }`.
 */
export function createAnimatedComponent(
  Component: typeof TextInput,
  options?: Options<InitialComponentProps>
): AnimatedComponentType<
  Readonly<ComponentProps<typeof TextInput>>,
  typeof TextInput,
  { text?: SharedValueDisableContravariance<string> }
>;

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

export function createAnimatedComponent<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TInstance extends AnimatableComponent<ComponentType<any>>,
>(
  Component: TInstance,
  options?: Options<InitialComponentProps>
): AnimatedComponentType<Readonly<ComponentProps<TInstance>>, TInstance> {
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
    props: Omit<AnimatedProps<ComponentProps<TInstance>>, 'ref'> & {
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
