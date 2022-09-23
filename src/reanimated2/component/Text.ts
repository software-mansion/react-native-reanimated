import { Text } from 'react-native';
import createAnimatedComponent from '../../createAnimatedComponent';

export const AnimatedText = createAnimatedComponent(Text as any);

export type AnimatedText = typeof AnimatedText & Text;
