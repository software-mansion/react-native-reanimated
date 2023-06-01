import { View, ViewProps } from 'react-native';
import createAnimatedComponent from '../../createAnimatedComponent';
import { Component } from 'react';
import { AnimateProps } from '../helperTypes';

declare class AnimatedViewType implements Component<AnimateProps<ViewProps>> {
  getNode(): View;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface AnimatedViewType extends View {}

// // @ts-ignore TODO TYPESCRIPT
export const AnimatedView = createAnimatedComponent(View);
export type AnimatedView = AnimatedViewType;

// export type AnimatedView = View & AnimatedView;
