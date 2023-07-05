import type { ImageProps } from 'react-native';
import { Image } from 'react-native';
import createAnimatedComponent from '../../createAnimatedComponent';
import { Component } from 'react';
import type { AnimateProps } from '../helperTypes';

// TODO TYPESCRIPT This is a temporary type to get rid of .d.ts file.
declare class AnimatedImageClass extends Component<AnimateProps<ImageProps>> {
  getNode(): Image;
}

export type AnimatedImage = typeof AnimatedImageClass & Image;

export const AnimatedImage = createAnimatedComponent(
  Image as any
) as unknown as AnimatedImage; // TODO TYPESCRIPT This temporary cast is to get rid of .d.ts file.
