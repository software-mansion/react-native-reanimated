'use strict';
import type { ComponentProps, ComponentRef } from 'react';
import React, { useMemo } from 'react';
import { ScrollView } from 'react-native';

import type { SharedValue } from '../commonTypes';
import {
  type AnimatedComponentType,
  createAnimatedComponent,
} from '../createAnimatedComponent';
import type { AnimatedRef } from '../hook';
import { useAnimatedRef, useScrollOffset } from '../hook';
import { mergeRefs } from '../reactUtils';

// Since createAnimatedComponent return type is ComponentClass that has the props of the argument,
// but not things like NativeMethods, etc. we need to add them manually by extending the type.
type AnimatedScrollViewComplement = ComponentRef<typeof ScrollView> & {
  getNode(): ComponentRef<typeof ScrollView>;
};

// is-tree-shakable-suppress
const AnimatedScrollViewComponent: AnimatedComponentType<
  Readonly<ComponentProps<typeof ScrollView>>,
  ComponentRef<typeof ScrollView>
> = createAnimatedComponent(ScrollView);

export type AnimatedScrollViewProps = ComponentProps<
  typeof AnimatedScrollViewComponent
> & {
  scrollViewOffset?: SharedValue<number>;
};

export function AnimatedScrollView({
  scrollViewOffset,
  ref,
  ...restProps
}: AnimatedScrollViewProps) {
  const offsetRef = useAnimatedRef<ScrollView>();
  const refWithOffset = useMemo(
    () => mergeRefs(ref, offsetRef),
    [ref, offsetRef]
  );

  // Set default scrollEventThrottle, because user expects
  // to have continuous scroll events.
  // We set it to 1 so we have peace until
  // there are 960 fps screens.
  if (!('scrollEventThrottle' in restProps)) {
    restProps.scrollEventThrottle = 1;
  }

  return (
    <>
      <AnimatedScrollViewComponent ref={refWithOffset} {...restProps} />
      {scrollViewOffset ? (
        <ScrollViewOffset animatedRef={offsetRef} offset={scrollViewOffset} />
      ) : null}
    </>
  );
}

function ScrollViewOffset({
  animatedRef,
  offset,
}: {
  animatedRef: AnimatedRef<ScrollView>;
  offset: SharedValue<number>;
}) {
  useScrollOffset(animatedRef, offset);
  return null;
}

export type AnimatedScrollView = AnimatedScrollViewComplement &
  typeof AnimatedScrollViewComponent;
