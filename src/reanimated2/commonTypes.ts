import { ViewStyle, TextStyle } from 'react-native';
import { Animation, AnimationObject } from './animation/commonTypes';

export type StyleProps =
  | ViewStyle
  | TextStyle
  | { originX?: number; originY?: number };

export type AnimatedStyle =
  | Record<string, Animation<AnimationObject>>
  | { transform: Record<string, Animation<AnimationObject>>[] };
