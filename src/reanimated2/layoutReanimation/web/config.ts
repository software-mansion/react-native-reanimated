'use strict';
import type { ReduceMotion } from '../../commonTypes';
import type { LayoutAnimationType } from '../animationBuilder/commonTypes';
import {
  BounceIn,
  BounceInData,
  BounceOut,
  BounceOutData,
} from './animation/Bounce.web';
import { FadeIn, FadeInData, FadeOut, FadeOutData } from './animation/Fade.web';
import { FlipIn, FlipInData, FlipOut, FlipOutData } from './animation/Flip.web';
import {
  LightSpeedIn,
  LightSpeedInData,
  LightSpeedOut,
  LightSpeedOutData,
} from './animation/Lightspeed.web';
import { Pinwheel, PinwheelData } from './animation/Pinwheel.web';
import { RollIn, RollInData, RollOut, RollOutData } from './animation/Roll.web';
import {
  RotateIn,
  RotateInData,
  RotateOut,
  RotateOutData,
} from './animation/Rotate.web';
import {
  SlideIn,
  SlideInData,
  SlideOut,
  SlideOutData,
} from './animation/Slide.web';
import {
  StretchIn,
  StretchInData,
  StretchOut,
  StretchOutData,
} from './animation/Stretch.web';
import { ZoomIn, ZoomInData, ZoomOut, ZoomOutData } from './animation/Zoom.web';

import type { AnimationData } from './animationParser';

export type AnimationCallback = ((finished: boolean) => void) | null;

export interface AnimationConfig {
  animationName: string;
  animationType: LayoutAnimationType;
  duration: number;
  delay: number;
  easing: string;
  callback: AnimationCallback;
  reversed: boolean;
}

export interface CustomConfig {
  easingV?: () => number;
  durationV?: number;
  delayV?: number;
  randomizeDelay?: boolean;
  reduceMotionV?: ReduceMotion;
  callbackV?: AnimationCallback;
  reversed?: boolean;
}

export enum TransitionType {
  LINEAR,
  SEQUENCED,
  FADING,
}

export const AnimationsData: Record<string, AnimationData> = {
  ...FadeInData,
  ...FadeOutData,
  ...BounceInData,
  ...BounceOutData,
  ...FlipInData,
  ...FlipOutData,
  ...StretchInData,
  ...StretchOutData,
  ...ZoomInData,
  ...ZoomOutData,
  ...SlideInData,
  ...SlideOutData,
  ...LightSpeedInData,
  ...LightSpeedOutData,
  ...PinwheelData,
  ...RotateInData,
  ...RotateOutData,
  ...RollInData,
  ...RollOutData,
};

export const Animations = {
  ...FadeIn,
  ...FadeOut,
  ...BounceIn,
  ...BounceOut,
  ...FlipIn,
  ...FlipOut,
  ...StretchIn,
  ...StretchOut,
  ...ZoomIn,
  ...ZoomOut,
  ...SlideIn,
  ...SlideOut,
  ...LightSpeedIn,
  ...LightSpeedOut,
  ...Pinwheel,
  ...RotateIn,
  ...RotateOut,
  ...RollIn,
  ...RollOut,
};

// Those are the easings that can be implemented using Bezier curves.
// Others should be done as CSS animations
export const WebEasings = {
  linear: [0, 0, 1, 1],
  ease: [0.42, 0, 1, 1],
  quad: [0.11, 0, 0.5, 0],
  cubic: [0.32, 0, 0.67, 0],
  sin: [0.12, 0, 0.39, 0],
  circle: [0.55, 0, 1, 0.45],
  exp: [0.7, 0, 0.84, 0],
};

export type AnimationNames = keyof typeof Animations;
export type LayoutTransitionsNames = keyof typeof AnimationsData;
export type WebEasingsNames = keyof typeof WebEasings;
