import 'react-native-svg';

import type { NumberProp } from 'react-native-svg';
import type { ColorValue } from 'react-native';

declare module 'react-native-svg' {
  export interface GradientStop {
    offset: NumberProp;
    color?: ColorValue | number;
  }

  export interface RadialGradientProps {
    gradient?: GradientStop[];
  }

  export interface LinearGradientProps {
    gradient?: GradientStop[];
  }
}
