'use strict';

import 'react-native-svg';

import type { ColorValue } from 'react-native';
import type { NumberProp } from 'react-native-svg';

declare module 'react-native-svg' {
  export interface GradientStop {
    offset: NumberProp;
    color?: ColorValue | number;
    opacity?: NumberProp;
  }

  export interface RadialGradientProps {
    gradient?: GradientStop[];
  }

  export interface LinearGradientProps {
    gradient?: GradientStop[];
  }
}
