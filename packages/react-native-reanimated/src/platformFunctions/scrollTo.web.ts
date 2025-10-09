'use strict';
import type { ComponentRef } from 'react';
import type { ScrollView } from 'react-native';

import { logger } from '../common';
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
  if (!element) {
    logger.warn(
      'Called scrollTo() with an uninitialized ref. Make sure to pass the animated ref to the scrollable component before calling scrollTo().'
    );
    return;
  }

  // By ScrollView we mean any scrollable component
  const scrollView = element as unknown as ComponentRef<typeof ScrollView>;
  scrollView?.scrollTo({ x, y, animated });
}
