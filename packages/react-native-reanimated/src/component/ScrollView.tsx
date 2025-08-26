'use strict';
import type { ComponentRef, Ref } from 'react';
import React from 'react';
import type { ScrollViewProps } from 'react-native';
import { ScrollView } from 'react-native';

import { ReanimatedError } from '../common';
import type { SharedValue } from '../commonTypes';
import { createAnimatedComponent } from '../createAnimatedComponent';
import type { AnimatedProps } from '../helperTypes';
import { useAnimatedRef, useScrollOffset } from '../hook';
import { isAnimatedRef } from '../hook/useAnimatedRef';

export interface AnimatedScrollViewProps
  extends AnimatedProps<ScrollViewProps> {
  scrollViewOffset?: SharedValue<number>;
  ref?: Ref<ComponentRef<AnimatedScrollView>> | null;
}

// Since createAnimatedComponent return type is ComponentClass that has the props of the argument,
// but not things like NativeMethods, etc. we need to add them manually by extending the type.
interface AnimatedScrollViewComplement extends ScrollView {
  getNode(): ScrollView;
}

const AnimatedScrollViewComponent = createAnimatedComponent(ScrollView);

export function AnimatedScrollView({
  scrollViewOffset,
  ref: refProp,
  ...restProps
}: AnimatedScrollViewProps) {
  let ref = refProp;

  if (scrollViewOffset) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    ref ??= useAnimatedRef<ComponentRef<typeof ScrollView>>();

    if (!isAnimatedRef(ref)) {
      throw new ReanimatedError(
        'Animated.ScrollView with scrollViewOffset requires an animated ref. Please pass an animated ref instead.'
      );
    }

    // eslint-disable-next-line react-hooks/rules-of-hooks
    useScrollOffset(ref, scrollViewOffset);
  }

  // Set default scrollEventThrottle, because user expects
  // to have continuous scroll events.
  // We set it to 1 so we have peace until
  // there are 960 fps screens.
  if (!('scrollEventThrottle' in restProps)) {
    restProps.scrollEventThrottle = 1;
  }

  return <AnimatedScrollViewComponent ref={ref} {...restProps} />;
}

export type AnimatedScrollView = AnimatedScrollViewComplement &
  typeof AnimatedScrollViewComponent;
