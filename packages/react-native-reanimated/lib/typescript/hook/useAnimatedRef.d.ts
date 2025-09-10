import type { WrapperRef } from '../commonTypes';
import type { AnimatedRef } from './commonTypes';
declare function useAnimatedRefWeb<TRef extends WrapperRef = React.Component>(): AnimatedRef<TRef>;
/**
 * Lets you get a reference of a view that you can use inside a worklet.
 *
 * @returns An object with a `.current` property which contains an instance of
 *   the reference object.
 * @see https://docs.swmansion.com/react-native-reanimated/docs/core/useAnimatedRef
 */
export declare const useAnimatedRef: typeof useAnimatedRefWeb;
export {};
//# sourceMappingURL=useAnimatedRef.d.ts.map