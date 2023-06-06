import { Image, ImageProps } from 'react-native';
import createAnimatedComponent from '../../createAnimatedComponent';
import { Component } from 'react';
import { AnimateProps } from '../helperTypes';

declare class AnimatedImageClass extends Component<AnimateProps<ImageProps>> {
  getNode(): Image;
}

export type AnimatedImage = typeof AnimatedImageClass & Image;

export const AnimatedImage = createAnimatedComponent(
  Image as any
) as unknown as AnimatedImage;
