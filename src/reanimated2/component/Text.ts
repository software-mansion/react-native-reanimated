import { Text } from 'react-native';
import createAnimatedComponent from '../../createAnimatedComponent';

export const AnimatedText = createAnimatedComponent(Text);

export type AnimatedText = typeof AnimatedText & Text;
