import type { ViewProps } from 'react-native';
import { View } from 'react-native';
import createAnimatedComponent from '../../createAnimatedComponent/createAnimatedComponent';
import { Component } from 'react';
import type { AnimateProps } from '../helperTypes';

// TODO TYPESCRIPT This is a temporary type to get rid of .d.ts file.
declare class AnimatedViewClass extends Component<AnimateProps<ViewProps>> {
  getNode(): View;
}
export type AnimatedView = typeof AnimatedViewClass & View;

export const AnimatedView = createAnimatedComponent(View);
