'use strict';
import type { GestureResponderHandlers } from 'react-native';
import type {
  AccessibilityProps,
  ColorProps,
  DefinitionProps,
  FillProps,
  NativeProps,
  ResponderProps,
  StrokeProps,
  TouchableProps,
  TransformProps,
} from 'react-native-svg';

import { processColor, type PropsBuilderConfig } from '../../../../common/web';
import { processStrokeDashArray, processVectorEffect } from '../processors';

const colorAttributes = { process: processColor };

const colorProps: PropsBuilderConfig<ColorProps> = {
  color: colorAttributes,
};

const fillProps: PropsBuilderConfig<FillProps> = {
  fill: colorAttributes,
  fillOpacity: true,
  fillRule: true,
};

const strokeProps: PropsBuilderConfig<StrokeProps> = {
  stroke: colorAttributes,
  strokeWidth: 'px',
  strokeOpacity: true,
  strokeDasharray: { process: processStrokeDashArray },
  strokeDashoffset: 'px',
  strokeLinecap: true,
  strokeLinejoin: true,
  strokeMiterlimit: true,
  vectorEffect: { process: processVectorEffect },
};

const transformProps: PropsBuilderConfig<TransformProps> = {
  transform: true,
};

const responderProps: PropsBuilderConfig<
  Omit<ResponderProps, keyof GestureResponderHandlers>
> = {
  pointerEvents: true,
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

export const SVG_COMMON_WEB_PROPERTIES_CONFIG = {
  ...colorProps,
  ...fillProps,
  ...strokeProps,
  ...transformProps,
  ...responderProps,
  opacity: true,
} as const;
