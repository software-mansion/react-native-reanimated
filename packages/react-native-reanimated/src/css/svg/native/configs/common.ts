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
} from 'react-native-svg';

import type { PropsBuilderConfig } from '../../../../common';
import {
  convertStringToNumber,
  processColorSVG,
  processPercentage,
  processStrokeDashArray,
} from '../processors';

const colorAttributes = { process: processColorSVG };

const colorProps: PropsBuilderConfig<ColorProps> = {
  color: colorAttributes,
};

const fillProps: PropsBuilderConfig<FillProps> = {
  fill: colorAttributes,
  fillOpacity: { process: processPercentage },
  fillRule: {
    process: convertStringToNumber({
      evenodd: 0,
      nonzero: 1,
    }),
  },
};

const strokeProps: PropsBuilderConfig<StrokeProps> = {
  stroke: colorAttributes,
  strokeWidth: true,
  strokeOpacity: { process: processPercentage },
  strokeDasharray: { process: processStrokeDashArray },
  strokeDashoffset: true,
  strokeLinecap: {
    process: convertStringToNumber({
      butt: 0,
      square: 2,
      round: 1,
    }),
  },
  strokeLinejoin: {
    process: convertStringToNumber({
      miter: 0,
      bevel: 2,
      round: 1,
    }),
  },
  strokeMiterlimit: true,
  vectorEffect: {
    process: convertStringToNumber({
      none: 0,
      default: 0,
      nonScalingStroke: 1,
      'non-scaling-stroke': 1,
      inherit: 2,
      uri: 3,
    }),
  },
};

// react-native-svg only cascades a fill/stroke prop to an element's children
// when the element received it in JS, since that is what it builds `propList`
// from. A CSS animation writes straight to the shadow node, so the prop has to
// be passed inline as well, at the value react-native-svg draws with when it is
// unset. These are those rendering defaults, not the interpolation fallbacks in
// `InterpolatorRegistry.cpp`, and the two differ for `stroke` and `fillRule`.
export const SVG_INHERITED_PROP_DEFAULTS = {
  fill: 'black',
  fillOpacity: 1,
  fillRule: 'nonzero',
  stroke: 'none',
  strokeWidth: 1,
  strokeOpacity: 1,
  strokeDasharray: 'none',
  strokeDashoffset: 0,
  strokeLinecap: 'butt',
  strokeLinejoin: 'miter',
  strokeMiterlimit: 4,
  // `vectorEffect` is the one stroke prop react-native-svg keeps off `propList`
} as const satisfies Required<
  Pick<
    FillProps & StrokeProps,
    keyof typeof fillProps | Exclude<keyof typeof strokeProps, 'vectorEffect'>
  >
>;

const clipProps: PropsBuilderConfig<ClipProps> = {
  clipRule: true,
  clipPath: true, // TODO - maybe preprocess this?
};

const transformProps: PropsBuilderConfig<TransformProps> = {
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

const responderProps: PropsBuilderConfig<
  Omit<ResponderProps, keyof GestureResponderHandlers>
> = {
  pointerEvents: true,
};

// TODO - check what these props are doing and if we need to preprocess them
const commonMarkerProps: PropsBuilderConfig<CommonMarkerProps> = {
  marker: true,
  markerStart: true,
  markerMid: true,
  markerEnd: true,
};

const commonMaskProps: PropsBuilderConfig<CommonMaskProps> = {
  mask: true, // TODO - add preprocessor
};

const commonFilterProps: PropsBuilderConfig<CommonFilterProps> = {
  filter: true, // TODO - add preprocessor
};

type NonAnimatablePropNames =
  | keyof GestureResponderHandlers
  | keyof TouchableProps
  | keyof DefinitionProps
  | keyof NativeProps
  | keyof AccessibilityProps;

export type SvgStyleBuilderConfig<T> = PropsBuilderConfig<
  Omit<T, NonAnimatablePropNames>
>;

export const SVG_COMMON_PROPERTIES_CONFIG = {
  ...colorProps,
  ...fillProps,
  ...strokeProps,
  ...clipProps,
  ...transformProps,
  ...responderProps,
  ...commonMarkerProps,
  ...commonMaskProps,
  ...commonFilterProps,
  opacity: { process: processPercentage },
} as const;
