import type { LayoutAnimationType, ReduceMotion, StyleProps } from '../../commonTypes';
import type { AnimationData, AnimationStyle } from './animationParser';
export type AnimationCallback = ((finished: boolean) => void) | null;
export type KeyframeDefinitions = Record<number, AnimationStyle>;
export type InitialValuesStyleProps = Omit<StyleProps, 'opacity'> & {
    opacity?: number;
};
export interface AnimationConfig {
    animationName: string;
    animationType: LayoutAnimationType;
    duration: number;
    delay: number;
    easing: string;
    callback: AnimationCallback;
    reversed: boolean;
}
interface EasingType {
    (): number;
    [EasingNameSymbol: symbol]: string;
}
export interface CustomConfig {
    easingV?: EasingType;
    easingXV?: EasingType;
    easingYV?: EasingType;
    durationV?: number;
    delayV?: number;
    randomizeDelay?: boolean;
    reduceMotionV?: ReduceMotion;
    callbackV?: AnimationCallback;
    reversed?: boolean;
    definitions?: KeyframeDefinitions;
    enteringV?: any;
    exitingV?: any;
    initialValues?: StyleProps;
}
export declare enum TransitionType {
    LINEAR = 0,
    SEQUENCED = 1,
    FADING = 2,
    JUMPING = 3,
    CURVED = 4,
    ENTRY_EXIT = 5
}
export declare const AnimationsData: Record<string, AnimationData>;
export declare const Animations: {
    RollOutLeft: {
        style: string;
        duration: number;
    };
    RollOutRight: {
        style: string;
        duration: number;
    };
    RollInLeft: {
        style: string;
        duration: number;
    };
    RollInRight: {
        style: string;
        duration: number;
    };
    RotateOutDownLeft: {
        style: string;
        duration: number;
    };
    RotateOutDownRight: {
        style: string;
        duration: number;
    };
    RotateOutUpLeft: {
        style: string;
        duration: number;
    };
    RotateOutUpRight: {
        style: string;
        duration: number;
    };
    RotateInDownLeft: {
        style: string;
        duration: number;
    };
    RotateInDownRight: {
        style: string;
        duration: number;
    };
    RotateInUpLeft: {
        style: string;
        duration: number;
    };
    RotateInUpRight: {
        style: string;
        duration: number;
    };
    PinwheelIn: {
        style: string;
        duration: number;
    };
    PinwheelOut: {
        style: string;
        duration: number;
    };
    LightSpeedOutRight: {
        style: string;
        duration: number;
    };
    LightSpeedOutLeft: {
        style: string;
        duration: number;
    };
    LightSpeedInRight: {
        style: string;
        duration: number;
    };
    LightSpeedInLeft: {
        style: string;
        duration: number;
    };
    SlideOutRight: {
        style: string;
        duration: number;
    };
    SlideOutLeft: {
        style: string;
        duration: number;
    };
    SlideOutUp: {
        style: string;
        duration: number;
    };
    SlideOutDown: {
        style: string;
        duration: number;
    };
    SlideInRight: {
        style: string;
        duration: number;
    };
    SlideInLeft: {
        style: string;
        duration: number;
    };
    SlideInUp: {
        style: string;
        duration: number;
    };
    SlideInDown: {
        style: string;
        duration: number;
    };
    ZoomOut: {
        style: string;
        duration: number;
    };
    ZoomOutRotate: {
        style: string;
        duration: number;
    };
    ZoomOutRight: {
        style: string;
        duration: number;
    };
    ZoomOutLeft: {
        style: string;
        duration: number;
    };
    ZoomOutUp: {
        style: string;
        duration: number;
    };
    ZoomOutDown: {
        style: string;
        duration: number;
    };
    ZoomOutEasyUp: {
        style: string;
        duration: number;
    };
    ZoomOutEasyDown: {
        style: string;
        duration: number;
    };
    ZoomIn: {
        style: string;
        duration: number;
    };
    ZoomInRotate: {
        style: string;
        duration: number;
    };
    ZoomInRight: {
        style: string;
        duration: number;
    };
    ZoomInLeft: {
        style: string;
        duration: number;
    };
    ZoomInUp: {
        style: string;
        duration: number;
    };
    ZoomInDown: {
        style: string;
        duration: number;
    };
    ZoomInEasyUp: {
        style: string;
        duration: number;
    };
    ZoomInEasyDown: {
        style: string;
        duration: number;
    };
    StretchOutX: {
        style: string;
        duration: number;
    };
    StretchOutY: {
        style: string;
        duration: number;
    };
    StretchInX: {
        style: string;
        duration: number;
    };
    StretchInY: {
        style: string;
        duration: number;
    };
    FlipOutYRight: {
        style: string;
        duration: number;
    };
    FlipOutYLeft: {
        style: string;
        duration: number;
    };
    FlipOutXUp: {
        style: string;
        duration: number;
    };
    FlipOutXDown: {
        style: string;
        duration: number;
    };
    FlipOutEasyX: {
        style: string;
        duration: number;
    };
    FlipOutEasyY: {
        style: string;
        duration: number;
    };
    FlipInYRight: {
        style: string;
        duration: number;
    };
    FlipInYLeft: {
        style: string;
        duration: number;
    };
    FlipInXUp: {
        style: string;
        duration: number;
    };
    FlipInXDown: {
        style: string;
        duration: number;
    };
    FlipInEasyX: {
        style: string;
        duration: number;
    };
    FlipInEasyY: {
        style: string;
        duration: number;
    };
    BounceOut: {
        style: string;
        duration: number;
    };
    BounceOutRight: {
        style: string;
        duration: number;
    };
    BounceOutLeft: {
        style: string;
        duration: number;
    };
    BounceOutUp: {
        style: string;
        duration: number;
    };
    BounceOutDown: {
        style: string;
        duration: number;
    };
    BounceIn: {
        style: string;
        duration: number;
    };
    BounceInRight: {
        style: string;
        duration: number;
    };
    BounceInLeft: {
        style: string;
        duration: number;
    };
    BounceInUp: {
        style: string;
        duration: number;
    };
    BounceInDown: {
        style: string;
        duration: number;
    };
    FadeOut: {
        style: string;
        duration: number;
    };
    FadeOutRight: {
        style: string;
        duration: number;
    };
    FadeOutLeft: {
        style: string;
        duration: number;
    };
    FadeOutUp: {
        style: string;
        duration: number;
    };
    FadeOutDown: {
        style: string;
        duration: number;
    };
    FadeIn: {
        style: string;
        duration: number;
    };
    FadeInRight: {
        style: string;
        duration: number;
    };
    FadeInLeft: {
        style: string;
        duration: number;
    };
    FadeInUp: {
        style: string;
        duration: number;
    };
    FadeInDown: {
        style: string;
        duration: number;
    };
};
export type AnimationNames = keyof typeof Animations;
export type LayoutTransitionsNames = keyof typeof AnimationsData;
export {};
//# sourceMappingURL=config.d.ts.map