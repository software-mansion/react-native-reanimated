'use strict';
import type { ForwardedRef } from 'react';
import React, { forwardRef } from 'react';
import type { ScrollViewProps } from 'react-native';
import { ScrollView } from 'react-native';
import { createAnimatedComponent } from '../createAnimatedComponent';
import type { SharedValue } from '../commonTypes';
import type { AnimatedRef } from '../hook';
import { useAnimatedRef, useScrollViewOffset } from '../hook';
import type { AnimatedProps } from '../helperTypes';

export interface AnimatedScrollViewProps
  extends AnimatedProps<ScrollViewProps> {
  scrollViewOffset?: SharedValue<number>;
}

// Since createAnimatedComponent return type is ComponentClass that has the props of the argument,
// but not things like NativeMethods, etc. we need to add them manually by extending the type.
interface AnimatedScrollViewComplement extends ScrollView {
  getNode(): ScrollView;
}

const AnimatedScrollViewComponent = createAnimatedComponent(ScrollView);

export const AnimatedScrollView = forwardRef(
  (props: AnimatedScrollViewProps, ref: ForwardedRef<AnimatedScrollView>) => {
    const { scrollViewOffset, ...restProps } = props;
    const animatedRef = (
      ref === null
        ? // eslint-disable-next-line react-hooks/rules-of-hooks
          useAnimatedRef<ScrollView>()
        : ref
    ) as AnimatedRef<AnimatedScrollView>;

    if (scrollViewOffset) {
      // eslint-disable-next-line react-hooks/rules-of-hooks
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
);

export type AnimatedScrollView = AnimatedScrollViewComplement &
  typeof AnimatedScrollViewComponent;
