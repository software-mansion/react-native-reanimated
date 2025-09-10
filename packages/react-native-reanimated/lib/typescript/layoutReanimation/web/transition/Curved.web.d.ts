import type { ReanimatedHTMLElement } from '../../../ReanimatedModule/js-reanimated';
import type { TransitionData } from '../animationParser';
import type { AnimationConfig } from '../config';
export declare function prepareCurvedTransition(element: ReanimatedHTMLElement, animationConfig: AnimationConfig, transitionData: TransitionData, dummyTransitionKeyframeName: string): {
    dummy: ReanimatedHTMLElement;
    dummyAnimationConfig: AnimationConfig;
};
export declare function CurvedTransition(keyframeXName: string, keyframeYName: string, transitionData: TransitionData): {
    firstKeyframeObj: {
        name: string;
        style: {
            0: {
                transform: {
                    translateX: string;
                    scale: string;
                }[];
            };
        };
        duration: number;
    };
    secondKeyframeObj: {
        name: string;
        style: {
            0: {
                transform: {
                    translateY: string;
                    scale: string;
                }[];
            };
        };
        duration: number;
    };
};
//# sourceMappingURL=Curved.web.d.ts.map