import { Component } from 'react';
import { Text, TextProps } from 'react-native';
import createAnimatedComponent from '../../createAnimatedComponent';
import { AnimateProps } from '../helperTypes';

declare class AnimatedTextType implements Component<AnimateProps<TextProps>> {
  getNode(): Text;
}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface AnimatedTextType extends Text {}

export const AnimatedText = createAnimatedComponent(Text as any);
export type AnimatedText = AnimatedTextType;
// export type AnimatedText = typeof AnimatedText & Text;
