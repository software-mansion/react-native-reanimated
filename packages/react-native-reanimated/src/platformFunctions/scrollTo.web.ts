'use strict';
import type { ComponentRef } from 'react';
import type { ScrollView } from 'react-native';

import type { InternalHostInstance } from '../commonTypes';
import type { AnimatedRef } from '../hook/commonTypes';

export function scrollTo<TRef extends InternalHostInstance>(
  animatedRef: AnimatedRef<TRef>,
  x: number,
  y: number,
  animated: boolean
) {
  const element = animatedRef();

  // This prevents crashes if ref has not been set yet
  if (element) {
    // By ScrollView we mean any scrollable component
    const scrollView = element as unknown as ComponentRef<typeof ScrollView>;
    scrollView?.scrollTo({ x, y, animated });
  }
}
