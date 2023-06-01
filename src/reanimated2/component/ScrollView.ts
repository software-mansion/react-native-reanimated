import { ScrollView, ScrollViewProps } from 'react-native';
import createAnimatedComponent from '../../createAnimatedComponent';
import { SharedValue } from '../commonTypes';
import { Component } from 'react';
import { AnimateProps } from '../helperTypes';

export const AnimatedScrollView = createAnimatedComponent(ScrollView);

interface AnimatedScrollViewProps extends ScrollViewProps {
  scrollViewOffset?: SharedValue<number>;
}
declare class AnimatedScrollViewType
  implements Component<AnimateProps<AnimatedScrollViewProps>>
{
  getNode(): ScrollView;
}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface AnimatedScrollViewType extends ScrollView {}
export type AnimatedScrollView = AnimatedScrollViewType;

// export type AnimatedScrollView = typeof AnimatedScrollView & ScrollView;
