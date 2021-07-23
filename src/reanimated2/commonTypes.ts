import { ViewStyle, TextStyle } from 'react-native';
import { Animation, AnimationObject } from './animation/commonTypes';

export interface StyleProps extends ViewStyle, TextStyle {
  originX?: number;
  originY?: number;
  [key: string]: any;
}

export interface AnimatedStyle
  extends Record<string, Animation<AnimationObject>> {
  [key: string]: any;
  transform: Array<Record<string, Animation<AnimationObject>>>;
}
