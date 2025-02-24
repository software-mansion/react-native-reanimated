'use strict';
import type {
  LayoutAnimationType,
  ReduceMotion,
  StyleProps,
} from '../../commonTypes';
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

export enum TransitionType {
  LINEAR,
  SEQUENCED,
  FADING,
  JUMPING,
  CURVED,
  ENTRY_EXIT,
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

export type AnimationNames = keyof typeof Animations;
export type LayoutTransitionsNames = keyof typeof AnimationsData;
