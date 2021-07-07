import { ViewStyle, TextStyle } from 'react-native';
import { Animation } from './animation/commonTypes';

export type StyleProps =
  | ViewStyle
  | TextStyle
  | { originX?: number; originY?: number };

export type AnimatedStyle =
  | Record<string, Animation>
  | Record<'transform', Record<string, Animation>[]>; // TODO
