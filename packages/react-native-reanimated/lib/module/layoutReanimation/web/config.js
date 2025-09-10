'use strict';

import { BounceIn, BounceInData, BounceOut, BounceOutData } from "./animation/Bounce.web.js";
import { FadeIn, FadeInData, FadeOut, FadeOutData } from "./animation/Fade.web.js";
import { FlipIn, FlipInData, FlipOut, FlipOutData } from "./animation/Flip.web.js";
import { LightSpeedIn, LightSpeedInData, LightSpeedOut, LightSpeedOutData } from "./animation/Lightspeed.web.js";
import { Pinwheel, PinwheelData } from "./animation/Pinwheel.web.js";
import { RollIn, RollInData, RollOut, RollOutData } from "./animation/Roll.web.js";
import { RotateIn, RotateInData, RotateOut, RotateOutData } from "./animation/Rotate.web.js";
import { SlideIn, SlideInData, SlideOut, SlideOutData } from "./animation/Slide.web.js";
import { StretchIn, StretchInData, StretchOut, StretchOutData } from "./animation/Stretch.web.js";
import { ZoomIn, ZoomInData, ZoomOut, ZoomOutData } from "./animation/Zoom.web.js";
export let TransitionType = /*#__PURE__*/function (TransitionType) {
  TransitionType[TransitionType["LINEAR"] = 0] = "LINEAR";
  TransitionType[TransitionType["SEQUENCED"] = 1] = "SEQUENCED";
  TransitionType[TransitionType["FADING"] = 2] = "FADING";
  TransitionType[TransitionType["JUMPING"] = 3] = "JUMPING";
  TransitionType[TransitionType["CURVED"] = 4] = "CURVED";
  TransitionType[TransitionType["ENTRY_EXIT"] = 5] = "ENTRY_EXIT";
  return TransitionType;
}({});
export const AnimationsData = {
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
  ...RollOutData
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
  ...RollOut
};
//# sourceMappingURL=config.js.map