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
  | 'swipeDown';

export type ScreenTransitionConfig = {
  stackTag: number;
  belowTopScreenTag: number;
  topScreenTag: number;
  screenTransition: AnimatedScreenTransition;
  isSwipeGesture: boolean;
  sharedEvent: SharedValue<PanGestureHandlerEventPayload>;
  startingGesturePosition: SharedValue<PanGestureHandlerEventPayload>;
  onFinishAnimation?: () => void;
  isTransitionCanceled: boolean;
  goBackGesture: GoBackGesture;
  screenDimensions: MeasuredDimensions;
};
