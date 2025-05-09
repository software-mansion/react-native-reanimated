import type { Component } from 'react';
import type { StyleProps } from '../commonTypes';
import type { AnimatedRef } from '../hook/commonTypes';
type SetNativeProps = <T extends Component>(animatedRef: AnimatedRef<T>, updates: StyleProps) => void;
/**
 * Lets you imperatively update component properties. You should always reach
 * for
 * [useAnimatedStyle](https://docs.swmansion.com/react-native-reanimated/docs/core/useAnimatedStyle)
 * and
 * [useAnimatedProps](https://docs.swmansion.com/react-native-reanimated/docs/core/useAnimatedProps)
 * first when animating styles or properties.
 *
 * @param animatedRef - An [animated
 *   ref](https://docs.swmansion.com/react-native-reanimated/docs/core/useAnimatedRef#returns)
 *   connected to the component you'd want to update.
 * @param updates - An object with properties you want to update.
 * @see https://docs.swmansion.com/react-native-reanimated/docs/advanced/setNativeProps
 */
export declare let setNativeProps: SetNativeProps;
export {};
//# sourceMappingURL=setNativeProps.d.ts.map