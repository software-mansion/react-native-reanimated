import { View, ViewProps } from 'react-native';
import createAnimatedComponent from '../../createAnimatedComponent';
import { Component } from 'react';
import { AnimateProps } from 'src/reanimated2/helperTypes';

declare class AnimatedViewType implements Component<AnimateProps<ViewProps>> {
  getNode(): View;
}

interface AnimatedViewType extends View {}

// // @ts-ignore TODO TYPESCRIPT
export const AnimatedView = createAnimatedComponent(View);
export type AnimatedView = AnimatedViewType;

// export type AnimatedView = View & AnimatedView;
