import { ScrollView } from 'react-native';
import createAnimatedComponent from '../../createAnimatedComponent';

export const AnimatedScrollView = createAnimatedComponent(ScrollView);

export type AnimatedScrollView = typeof AnimatedScrollView & ScrollView;
