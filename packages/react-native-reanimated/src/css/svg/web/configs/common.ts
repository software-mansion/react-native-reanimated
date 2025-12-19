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

import type { PropsBuilderConfig } from '../../../../common/web';

// Web SVG uses standard CSS units and values
const colorAttributes = true; // CSS handles color processing

const colorProps: PropsBuilderConfig<ColorProps> = {
  color: colorAttributes,
};

const fillProps: PropsBuilderConfig<FillProps> = {
  fill: colorAttributes,
  fillOpacity: true,
  fillRule: true, // Use CSS values directly: 'evenodd' | 'nonzero'
};

const strokeProps: PropsBuilderConfig<StrokeProps> = {
  stroke: colorAttributes,
  strokeWidth: true,
  strokeOpacity: true,
  strokeDasharray: true, // CSS handles array syntax
  strokeDashoffset: true,
  strokeLinecap: true, // Use CSS values directly: 'butt' | 'square' | 'round'
  strokeLinejoin: true, // Use CSS values directly: 'miter' | 'bevel' | 'round'
  strokeMiterlimit: true,
  vectorEffect: true, // Use CSS values directly
};

const clipProps: PropsBuilderConfig<ClipProps> = {
  clipRule: true,
  clipPath: true,
};

const transformProps: PropsBuilderConfig<TransformProps> = {
  translate: true,
  translateX: 'px',
  translateY: 'px',
  origin: true,
  originX: 'px',
  originY: 'px',
  scale: true,
  scaleX: true,
  scaleY: true,
  skew: true,
  skewX: 'deg',
  skewY: 'deg',
  rotation: 'deg',
  x: 'px',
  y: 'px',
  transform: true,
};

const responderProps: PropsBuilderConfig<
  Omit<ResponderProps, keyof GestureResponderHandlers>
> = {
  pointerEvents: true,
};

const commonMarkerProps: PropsBuilderConfig<CommonMarkerProps> = {
  marker: true,
  markerStart: true,
  markerMid: true,
  markerEnd: true,
};

const commonMaskProps: PropsBuilderConfig<CommonMaskProps> = {
  mask: true,
};

const commonFilterProps: PropsBuilderConfig<CommonFilterProps> = {
  filter: true,
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
  opacity: true,
} as const;
