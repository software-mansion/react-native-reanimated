'use strict';
import { Image } from 'react-native';
import { createAnimatedComponent } from '../createAnimatedComponent';

// Since createAnimatedComponent return type is ComponentClass that has the props of the argument,
// but not things like NativeMethods, etc. we need to add them manually by extending the type.
interface AnimatedImageComplement extends Image {
  getNode(): Image;
}

export const AnimatedImage = createAnimatedComponent(Image);

export type AnimatedImage = typeof AnimatedImage & AnimatedImageComplement;
