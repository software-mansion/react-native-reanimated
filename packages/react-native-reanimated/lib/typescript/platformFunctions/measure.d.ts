import type { Component } from 'react';
import type { MeasuredDimensions } from '../commonTypes';
import type { AnimatedRef } from '../hook/commonTypes';
type Measure = <T extends Component>(animatedRef: AnimatedRef<T>) => MeasuredDimensions | null;
/**
 * Lets you synchronously get the dimensions and position of a view on the
 * screen.
 *
 * @param animatedRef - An [animated
 *   ref](https://docs.swmansion.com/react-native-reanimated/docs/core/useAnimatedRef#returns)
 *   connected to the component you'd want to get the measurements from.
 * @returns An object containing component measurements or null when the
 *   measurement couldn't be performed- {@link MeasuredDimensions}.
 * @see https://docs.swmansion.com/react-native-reanimated/docs/advanced/measure/
 */
export declare let measure: Measure;
export {};
//# sourceMappingURL=measure.d.ts.map