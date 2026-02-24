'use strict';

import type { ColorValue } from 'react-native';
import type { NumberProp, Units } from 'react-native-svg';

export type CSSGradientStop = {
  offset: NumberProp;
  color?: ColorValue | number;
  opacity?: NumberProp;
};

export type CSSRadialGradientProps = {
  fx?: NumberProp;
  fy?: NumberProp;
  rx?: NumberProp;
  ry?: NumberProp;
  cx?: NumberProp;
  cy?: NumberProp;
  r?: NumberProp;
  gradientUnits?: Units;
  // TODO: Implement 'gradientTransform'
  // gradientTransform?: TransformsArray;
  id?: string;
  gradient?: CSSGradientStop[];
};

export type CSSLinearGradientProps = {
  x1?: NumberProp;
  x2?: NumberProp;
  y1?: NumberProp;
  y2?: NumberProp;
  gradientUnits?: Units;
  // TODO: Implement 'gradientTransform'
  // gradientTransform?: TransformsArray;
  id?: string;
  gradient?: CSSGradientStop[];
};
