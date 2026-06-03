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
  strokeDasharray: 'px',
  strokeDashoffset: 'px',
  strokeLinecap: true,
  strokeLinejoin: true,
  strokeMiterlimit: true,
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
