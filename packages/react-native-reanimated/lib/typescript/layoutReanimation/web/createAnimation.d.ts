import type { TransitionData } from './animationParser';
import type { InitialValuesStyleProps, KeyframeDefinitions } from './config';
import { TransitionType } from './config';
export declare function createCustomKeyFrameAnimation(keyframeDefinitions: KeyframeDefinitions): string;
export declare function createAnimationWithInitialValues(animationName: string, initialValues: InitialValuesStyleProps): string;
/**
 * Creates transition of given type, appends it to stylesheet and returns
 * keyframe name.
 *
 * @param transitionType - Type of transition (e.g. LINEAR).
 * @param transitionData - Object containing data for transforms (translateX,
 *   scaleX,...).
 * @returns Keyframe name that represents transition.
 */
export declare function TransitionGenerator(transitionType: TransitionType, transitionData: TransitionData): {
    transitionKeyframeName: string;
    dummyTransitionKeyframeName: string | undefined;
};
//# sourceMappingURL=createAnimation.d.ts.map