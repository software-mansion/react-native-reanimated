'use strict';

import type { AnimatableValue, AnimationObject } from '../commonTypes';

export type NativeEasingNode =
  | { kind: 'linear' }
  | {
      kind: 'cubicBezier';
      controlPoints: [number, number, number, number];
    };

export type NativeAnimationNode =
  | {
      kind: 'timing';
      durationMs: number;
      easing: NativeEasingNode | null;
      hasCallback: boolean;
      toValue: AnimatableValue;
    }
  | {
      kind: 'delay';
      delayMs: number;
      animation: NativeAnimationNode | null;
    }
  | {
      kind: 'sequence';
      animations: (NativeAnimationNode | null)[];
    };

export interface NativeCompilableAnimation extends AnimationObject {
  __nativeAnimation?: NativeAnimationNode;
}
