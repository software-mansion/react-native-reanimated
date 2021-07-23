import {
  PerpectiveTransform,
  RotateTransform,
  RotateXTransform,
  RotateYTransform,
  RotateZTransform,
  ScaleTransform,
  ScaleXTransform,
  ScaleYTransform,
  TranslateXTransform,
  TranslateYTransform,
  SkewXTransform,
  SkewYTransform,
  MatrixTransform,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Animation, AnimationObject } from './animation/commonTypes';

export type TransformProperty =
  | PerpectiveTransform
  | RotateTransform
  | RotateXTransform
  | RotateYTransform
  | RotateZTransform
  | ScaleTransform
  | ScaleXTransform
  | ScaleYTransform
  | TranslateXTransform
  | TranslateYTransform
  | SkewXTransform
  | SkewYTransform
  | MatrixTransform;

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
