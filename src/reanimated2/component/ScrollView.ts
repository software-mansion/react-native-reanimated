import { ScrollView, ScrollViewProps } from 'react-native';
import createAnimatedComponent from '../../createAnimatedComponent';
import { SharedValue } from '../commonTypes';
import { Component } from 'react';
import { AnimateProps } from '../helperTypes';

interface AnimatedScrollViewProps extends ScrollViewProps {
  scrollViewOffset?: SharedValue<number>;
}
declare class AnimatedScrollViewClass extends Component<
  AnimateProps<AnimatedScrollViewProps>
> {
  getNode(): ScrollView;
}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface AnimatedScrollViewInterface extends ScrollView {
  getNode(): ScrollView;
}

export const AnimatedScrollView = createAnimatedComponent(ScrollView);

export type AnimatedScrollView = typeof AnimatedScrollViewClass &
  AnimatedScrollViewInterface;

// export type AnimatedScrollView = typeof AnimatedScrollView & ScrollView;
