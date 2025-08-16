'use strict';
import type { ScrollView } from 'react-native';

import type { ComponentWithInstanceMethods } from '../commonTypes';
import type { AnimatedRef } from '../hook/commonTypes';

export function scrollTo<TComponent extends ComponentWithInstanceMethods>(
  animatedRef: AnimatedRef<TComponent>,
  x: number,
  y: number,
  animated: boolean
) {
  const element = animatedRef();

  // This prevents crashes if ref has not been set yet
  if (element) {
    // By ScrollView we mean any scrollable component
    const scrollView = element as unknown as ScrollView;
    scrollView?.scrollTo({ x, y, animated });
  }
}
