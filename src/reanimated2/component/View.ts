import { View, ViewProps } from 'react-native';
import createAnimatedComponent from '../../createAnimatedComponent';
import { Component } from 'react';
import { AnimateProps } from '../helperTypes';

// TODO TYPESCRIPT This is a temporary type to get rid of .d.ts file.
declare class AnimatedViewClass extends Component<AnimateProps<ViewProps>> {
  getNode(): View;
}
export type AnimatedView = typeof AnimatedViewClass & View;

export const AnimatedView = createAnimatedComponent(View);
