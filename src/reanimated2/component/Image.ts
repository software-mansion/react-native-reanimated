import { Image, ImageProps } from 'react-native';
import createAnimatedComponent from '../../createAnimatedComponent';
import { Component } from 'react';
import { AnimateProps } from '../helperTypes';

export const AnimatedImage = createAnimatedComponent(Image as any);

declare class AnimatedImageType implements Component<AnimateProps<ImageProps>> {
  getNode(): Image;
}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface AnimatedImageType extends Image {}

export type AnimatedImage = AnimatedImageType;

// export type AnimatedImage = typeof AnimatedImage & Image;
