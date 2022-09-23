import { View } from 'react-native';
import createAnimatedComponent from '../../createAnimatedComponent';

export const AnimatedView = createAnimatedComponent(View);

export type AnimatedView = typeof AnimatedView & View;
