import { Component } from 'react';
import { Text, TextProps } from 'react-native';
import createAnimatedComponent from '../../createAnimatedComponent';
import { AnimateProps } from '../helperTypes';

declare class AnimatedTextClass extends Component<AnimateProps<TextProps>> {
  getNode(): Text;
}

export const AnimatedText = createAnimatedComponent(
  Text as any
) as unknown as AnimatedText;

export type AnimatedText = typeof AnimatedTextClass & Text;
