import type { MeasuredDimensions, ShadowNodeWrapper, SharedValue } from '../commonTypes';
export type PanGestureHandlerEventPayload = {
    x: number;
    y: number;
    absoluteX: number;
    absoluteY: number;
    translationX: number;
    translationY: number;
    velocityX: number;
    velocityY: number;
};
export type AnimatedScreenTransition = {
    topScreenStyle: (event: PanGestureHandlerEventPayload, screenDimensions: MeasuredDimensions) => Record<string, unknown>;
    belowTopScreenStyle: (event: PanGestureHandlerEventPayload, screenDimensions: MeasuredDimensions) => Record<string, unknown>;
};
export type GoBackGesture = 'swipeRight' | 'swipeLeft' | 'swipeUp' | 'swipeDown' | 'verticalSwipe' | 'horizontalSwipe' | 'twoDimensionalSwipe';
export type ScreenTransitionConfig = {
    stackTag: number;
    belowTopScreenId: number | ShadowNodeWrapper;
    topScreenId: number | ShadowNodeWrapper;
    screenTransition: AnimatedScreenTransition;
    sharedEvent: SharedValue<PanGestureHandlerEventPayload>;
    startingGesturePosition: SharedValue<PanGestureHandlerEventPayload>;
    onFinishAnimation?: () => void;
    isTransitionCanceled: boolean;
    goBackGesture: GoBackGesture;
    screenDimensions: MeasuredDimensions;
};
export type RNScreensTurboModuleType = {
    startTransition: (stackTag: number) => {
        topScreenId: number | ShadowNodeWrapper;
        belowTopScreenId: number | ShadowNodeWrapper;
        canStartTransition: boolean;
    };
    updateTransition: (stackTag: number, progress: number) => void;
    finishTransition: (stackTag: number, isCanceled: boolean) => void;
};
export type LockAxis = 'x' | 'y' | undefined;
//# sourceMappingURL=commonTypes.d.ts.map