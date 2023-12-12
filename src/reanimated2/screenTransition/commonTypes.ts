'use strict';

import type { MeasuredDimensions, SharedValue } from '../commonTypes';

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
  topScreenFrame: (
    event: PanGestureHandlerEventPayload,
    screenSize: MeasuredDimensions
  ) => Record<string, unknown>;
  belowTopScreenFrame: (
    event: PanGestureHandlerEventPayload,
    screenSize: MeasuredDimensions
  ) => Record<string, unknown>;
};

export type GoBackGesture =
  | 'swipeRight'
  | 'swipeLeft'
  | 'swipeUp'
  | 'swipeDown'
  | 'verticalSwipe'
  | 'horizontalSwipe'
  | 'twoDimensionalSwipe';

export type ScreenTransitionConfig = {
  stackTag: number;
  belowTopScreenTag: number;
  topScreenTag: number;
  screenTransition: AnimatedScreenTransition;
  sharedEvent: SharedValue<PanGestureHandlerEventPayload>;
  startingGesturePosition: SharedValue<PanGestureHandlerEventPayload>;
  onFinishAnimation?: () => void;
  isTransitionCanceled: boolean;
  goBackGesture: GoBackGesture;
  screenDimensions: MeasuredDimensions;
};

export enum ScreenTransitionCommand {
  Start = 1,
  Update = 2,
  Finish = 3,
}

export type RNScreensTurboModuleType = {
  startTransition: (stackTag: number) => {
    topScreenTag: number;
    belowTopScreenTag: number;
    canStartTransition: boolean;
  };
  updateTransition: (stackTag: number, progress: number) => void;
  finishTransition: (stackTag: number, isCanceled: boolean) => void;
}
