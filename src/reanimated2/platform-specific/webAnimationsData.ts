import {
  BounceIn,
  BounceInData,
  BounceOut,
  BounceOutData,
} from './webAnimationsData/Bounce.web';
import {
  FadeIn,
  FadeInData,
  FadeOut,
  FadeOutData,
} from './webAnimationsData/Fade.web';
import {
  FlipIn,
  FlipInData,
  FlipOut,
  FlipOutData,
} from './webAnimationsData/Flip.web';
import {
  LightSpeedIn,
  LightSpeedInData,
  LightSpeedOut,
  LightSpeedOutData,
} from './webAnimationsData/Lightspeed.web';
import { Pinwheel, PinwheelData } from './webAnimationsData/Pinwheel.web';
import {
  RollIn,
  RollInData,
  RollOut,
  RollOutData,
} from './webAnimationsData/Roll.web';
import {
  RotateIn,
  RotateInData,
  RotateOut,
  RotateOutData,
} from './webAnimationsData/Rotate.web';
import {
  SlideIn,
  SlideInData,
  SlideOut,
  SlideOutData,
} from './webAnimationsData/Slide.web';
import {
  StretchIn,
  StretchInData,
  StretchOut,
  StretchOutData,
} from './webAnimationsData/Stretch.web';
import {
  ZoomIn,
  ZoomInData,
  ZoomOut,
  ZoomOutData,
} from './webAnimationsData/Zoom.web';

import { AnimationData } from './webAnimationsData/animationParser';

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
export const WebEasings: Record<string, number[]> = {
  linear: [0, 0, 1, 1],
  ease: [0.42, 0, 1, 1],
  quad: [0.11, 0, 0.5, 0],
  cubic: [0.32, 0, 0.67, 0],
  sin: [0.12, 0, 0.39, 0],
  circle: [0.55, 0, 1, 0.45],
  exp: [0.7, 0, 0.84, 0],
};

export type AnimationsTypes = keyof typeof Animations;
export type LayoutTransitionsTypes = keyof typeof AnimationsData;
