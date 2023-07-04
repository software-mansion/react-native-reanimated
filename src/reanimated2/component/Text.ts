import { Component } from 'react';
import { Text, TextProps } from 'react-native';
import createAnimatedComponent from '../../createAnimatedComponent';
import { AnimateProps } from '../helperTypes';

// TODO TYPESCRIPT This is a temporary type to get rid of .d.ts file.
declare class AnimatedTextClass extends Component<AnimateProps<TextProps>> {
  getNode(): Text;
}

export const AnimatedText = createAnimatedComponent(
  Text as any
) as unknown as AnimatedText; // TODO TYPESCRIPT This temporary cast is to get rid of .d.ts file.

export type AnimatedText = typeof AnimatedTextClass & AnimatedTextClass & Text;
