import type { LayoutAnimationFunction, LayoutAnimationType } from './commonTypes';
/**
 * Lets you update the current configuration of the layout animation or shared
 * element transition for a given component. Configurations are batched and
 * applied at the end of the current execution block, right before sending the
 * response back to native.
 *
 * @param viewTag - The tag of the component you'd like to configure.
 * @param type - The type of the animation you'd like to configure -
 *   {@link LayoutAnimationType}.
 * @param config - The animation configuration - {@link LayoutAnimationFunction}
 *   or {@link Keyframe}. Passing `undefined` will remove the animation.
 * @param isUnmounting - Determines whether the configuration should be included
 *   at the end of the batch, after all the non-deferred configurations (even
 *   those that were updated later). This is used to retain the correct ordering
 *   of shared elements. Defaults to `false`.
 */
export declare let updateLayoutAnimations: (viewTag: number, type: LayoutAnimationType, config?: Keyframe | LayoutAnimationFunction, isUnmounting?: boolean) => void;
//# sourceMappingURL=UpdateLayoutAnimations.d.ts.map