import { Image } from 'react-native';
import createAnimatedComponent from '../../createAnimatedComponent';

export const AnimatedImage = createAnimatedComponent(Image as any);

export type AnimatedImage = typeof AnimatedImage & Image;
