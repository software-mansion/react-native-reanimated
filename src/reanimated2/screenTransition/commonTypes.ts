'use strict';

import type { MeasuredDimensions } from '../commonTypes';

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
