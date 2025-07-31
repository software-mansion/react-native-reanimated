'use strict';
import type { GestureResponderHandlers } from 'react-native';
import type {
  AccessibilityProps,
  ClipProps,
  ColorProps,
  CommonFilterProps,
  CommonMarkerProps,
  CommonMaskProps,
  DefinitionProps,
  FillProps,
  NativeProps,
  ResponderProps,
  StrokeProps,
  TouchableProps,
  TransformProps,
  VectorEffectProps,
} from 'react-native-svg';

import { type StyleBuilderConfig } from '../../style';
import { processColorSVG, processFillRule } from '../../style';

const colorAttributes = { process: processColorSVG };

const colorProps: StyleBuilderConfig<ColorProps> = {
  color: colorAttributes,
};

const fillProps: StyleBuilderConfig<FillProps> = {
  fill: colorAttributes,
  fillOpacity: true,
  fillRule: { process: processFillRule },
};

const stokeProps: StyleBuilderConfig<StrokeProps> = {
  stroke: colorAttributes,
  strokeWidth: true,
  strokeOpacity: true,
  strokeDasharray: true, // TODO - add preprocessor
  strokeDashoffset: true,
  strokeLinecap: true,
  strokeLinejoin: true,
  strokeMiterlimit: true,
  vectorEffect: true,
};

const clipProps: StyleBuilderConfig<ClipProps> = {
  clipRule: true,
  clipPath: true, // TODO - maybe preprocess this?
};

const transformProps: StyleBuilderConfig<TransformProps> = {
  translate: true, // TODO - add preprocessor (NumberArray) and split to translateX and translateY
  translateX: true,
  translateY: true,
  origin: true, // TODO - add preprocessor (NumberArray) and split to originX and originY
  originX: true,
  originY: true,
  scale: true, // TODO - add preprocessor (NumberArray) and split to scaleX and scaleY
  scaleX: true,
  scaleY: true,
  skew: true, // TODO - add preprocessor (NumberArray) and split to skewX and skewY
  skewX: true,
  skewY: true,
  rotation: true,
  x: true,
  y: true,
  transform: true, // TODO - add preprocessor
};

const vectorEffectProps: StyleBuilderConfig<VectorEffectProps> = {
  vectorEffect: true,
};

const responderProps: StyleBuilderConfig<
  Omit<ResponderProps, keyof GestureResponderHandlers>
> = {
  pointerEvents: true,
};

// TODO - check what these props are doing and if we need to preprocess them
const commonMarkerProps: StyleBuilderConfig<CommonMarkerProps> = {
  marker: true,
  markerStart: true,
  markerMid: true,
  markerEnd: true,
};

const commonMaskProps: StyleBuilderConfig<CommonMaskProps> = {
  mask: true, // TODO - add preprocessor
};

const commonFilterProps: StyleBuilderConfig<CommonFilterProps> = {
  filter: true, // TODO - add preprocessor
};

type NonAnimatablePropNames =
  | keyof GestureResponderHandlers
  | keyof TouchableProps
  | keyof DefinitionProps
  | keyof NativeProps
  | keyof AccessibilityProps;

export type SvgStyleBuilderConfig<T> = StyleBuilderConfig<
  Omit<T, NonAnimatablePropNames>
>;

export const commonSvgProps = {
  ...colorProps,
  ...fillProps,
  ...stokeProps,
  ...clipProps,
  ...transformProps,
  ...vectorEffectProps,
  ...responderProps,
  ...commonMarkerProps,
  ...commonMaskProps,
  ...commonFilterProps,
} as const;
