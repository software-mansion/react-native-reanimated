import type { ComponentClass, ComponentType, FunctionComponent } from 'react';
import type { FlatList, FlatListProps } from 'react-native';
import type { AnimatedProps } from '../helperTypes';
import type { Options } from './AnimatedComponent';
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
export declare function createAnimatedComponent<P extends object>(component: AnimatableComponent<FunctionComponent<P>>, options?: Options<P>): FunctionComponent<AnimatedProps<P>>;
export declare function createAnimatedComponent<P extends object>(component: AnimatableComponent<ComponentClass<P>>, options?: Options<P>): ComponentClass<AnimatedProps<P>>;
export declare function createAnimatedComponent<P extends object>(component: AnimatableComponent<ComponentType<P>>, options?: Options<P>): FunctionComponent<AnimatedProps<P>> | ComponentClass<AnimatedProps<P>>;
/**
 * @deprecated Please use `Animated.FlatList` component instead of calling
 *   `Animated.createAnimatedComponent(FlatList)` manually.
 */
export declare function createAnimatedComponent(component: AnimatableComponent<typeof FlatList<unknown>>, options?: Options<typeof FlatList<unknown>>): ComponentClass<AnimatedProps<FlatListProps<unknown>>>;
export {};
//# sourceMappingURL=createAnimatedComponent.d.ts.map