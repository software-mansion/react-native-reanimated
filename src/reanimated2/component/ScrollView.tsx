'use strict';
import type { ForwardedRef } from 'react';
import React, { Component, forwardRef } from 'react';
import type { ScrollViewProps } from 'react-native';
import { ScrollView } from 'react-native';
import { createAnimatedComponent } from '../../createAnimatedComponent';
import type { SharedValue } from '../commonTypes';
import type { AnimatedProps } from '../helperTypes';
import type { AnimatedRef } from '../hook';
import { useAnimatedRef, useScrollViewOffset } from '../hook';

export interface AnimatedScrollViewProps extends ScrollViewProps {
  scrollViewOffset?: SharedValue<number>;
}

// TODO TYPESCRIPT This is a temporary type to get rid of .d.ts file.
declare class AnimatedScrollViewClass extends Component<
  AnimatedProps<AnimatedScrollViewProps>
> {
  getNode(): ScrollView;
}
// TODO TYPESCRIPT This is a temporary type to get rid of .d.ts file.
// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface AnimatedScrollViewInterface extends ScrollView {
  getNode(): ScrollView;
}

const AnimatedScrollViewComponent = createAnimatedComponent(
  ScrollView as any
) as any;

export const AnimatedScrollView: AnimatedScrollView = forwardRef(
  (props: AnimatedScrollViewProps, ref: ForwardedRef<AnimatedScrollView>) => {
    const { scrollViewOffset, ...restProps } = props;
    const animatedRef = (
      ref === null ? useAnimatedRef<ScrollView>() : ref
    ) as AnimatedRef<AnimatedScrollView>;

    if (scrollViewOffset) {
      useScrollViewOffset(animatedRef, scrollViewOffset);
    }

    // Set default scrollEventThrottle, because user expects
    // to have continuous scroll events.
    // We set it to 1 so we have peace until
    // there are 960 fps screens.
    if (!('scrollEventThrottle' in restProps)) {
      restProps.scrollEventThrottle = 1;
    }

    return <AnimatedScrollViewComponent ref={animatedRef} {...restProps} />;
  }
) as unknown as AnimatedScrollView;

export type AnimatedScrollView = typeof AnimatedScrollViewClass &
  AnimatedScrollViewInterface;
