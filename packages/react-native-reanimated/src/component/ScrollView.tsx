'use strict';
import type { Ref } from 'react';
import React from 'react';
import type { ScrollViewProps } from 'react-native';
import { ScrollView } from 'react-native';

import type { SharedValue } from '../commonTypes';
import { createAnimatedComponent } from '../createAnimatedComponent';
import type { AnimatedProps } from '../helperTypes';
import type { AnimatedRef } from '../hook';
import { useAnimatedRef, useScrollOffset } from '../hook';

export interface AnimatedScrollViewProps
  extends AnimatedProps<ScrollViewProps> {
  scrollViewOffset?: SharedValue<number>;
  ref?: Ref<AnimatedScrollView> | null;
}

// Since createAnimatedComponent return type is ComponentClass that has the props of the argument,
// but not things like NativeMethods, etc. we need to add them manually by extending the type.
interface AnimatedScrollViewComplement extends ScrollView {
  getNode(): ScrollView;
}

const AnimatedScrollViewComponent = createAnimatedComponent(ScrollView);

export function AnimatedScrollView({
  scrollViewOffset,
  ref,
  ...restProps
}: AnimatedScrollViewProps) {
  const animatedRef = (
    ref === null
      ? // eslint-disable-next-line react-hooks/rules-of-hooks
        useAnimatedRef<ScrollView>()
      : ref
  ) as AnimatedRef<AnimatedScrollView>;

  if (scrollViewOffset) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useScrollOffset(animatedRef, scrollViewOffset);
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

export type AnimatedScrollView = AnimatedScrollViewComplement &
  typeof AnimatedScrollViewComponent;
