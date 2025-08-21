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

import type { StyleBuilderConfig } from '../../../native';
import {
  convertStringToNumber,
  processColorSVG,
  processOpacity,
  processStrokeDashArray,
} from '../processors';

const colorAttributes = { process: processColorSVG };

const colorProps: StyleBuilderConfig<ColorProps> = {
  color: colorAttributes,
};

const fillProps: StyleBuilderConfig<FillProps> = {
  fill: colorAttributes,
  fillOpacity: { process: processOpacity },
  fillRule: {
    process: convertStringToNumber({
      evenodd: 0,
      nonzero: 1,
    }),
  },
};

const strokeProps: StyleBuilderConfig<StrokeProps> = {
  stroke: colorAttributes,
  strokeWidth: true,
  strokeOpacity: { process: processOpacity },
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
  ...strokeProps,
  ...clipProps,
  ...transformProps,
  ...responderProps,
  ...commonMarkerProps,
  ...commonMaskProps,
  ...commonFilterProps,
} as const;
