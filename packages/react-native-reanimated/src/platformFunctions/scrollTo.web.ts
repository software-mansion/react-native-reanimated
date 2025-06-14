'use strict';
import type { Component } from 'react';
import type { ScrollView } from 'react-native';

import type { AnimatedRef } from '../hook/commonTypes';

export function scrollTo<T extends Component>(
  animatedRef: AnimatedRef<T>,
  x: number,
  y: number,
  animated: boolean
) {
  const element = animatedRef();

  // This prevents crashes if ref has not been set yet
  if (element) {
    // By ScrollView we mean any scrollable component
    const scrollView = element as HTMLElement as unknown as ScrollView;
    scrollView?.scrollTo({ x, y, animated });
  }
}
