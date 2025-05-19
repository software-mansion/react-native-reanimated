import type { ComponentClass, ComponentType, FunctionComponent } from 'react';
import type { FlatList, FlatListProps } from 'react-native';
import type { AnimateProps } from '../helperTypes';
import type { Options } from './AnimatedComponent';
/**
 * Lets you create an Animated version of any React Native component.
 *
 * @param component - The component you want to make animatable.
 * @returns A component that Reanimated is capable of animating.
 * @see https://docs.swmansion.com/react-native-reanimated/docs/core/createAnimatedComponent
 */
export declare function createAnimatedComponent<P extends object>(component: FunctionComponent<P>, options?: Options<P>): FunctionComponent<AnimateProps<P>>;
export declare function createAnimatedComponent<P extends object>(component: ComponentClass<P>, options?: Options<P>): ComponentClass<AnimateProps<P>>;
export declare function createAnimatedComponent<P extends object>(component: ComponentType<P>, options?: Options<P>): FunctionComponent<AnimateProps<P>> | ComponentClass<AnimateProps<P>>;
/**
 * @deprecated Please use `Animated.FlatList` component instead of calling
 *   `Animated.createAnimatedComponent(FlatList)` manually.
 */
export declare function createAnimatedComponent(component: typeof FlatList<unknown>, options?: Options<any>): ComponentClass<AnimateProps<FlatListProps<unknown>>>;
//# sourceMappingURL=createAnimatedComponent.d.ts.map