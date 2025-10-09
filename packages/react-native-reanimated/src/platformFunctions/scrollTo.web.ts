'use strict';
import type { Component } from 'react';
import type { ScrollView } from 'react-native';

import type { AnimatedRef } from '../hook/commonTypes';
import { logger } from '../logger';

export function scrollTo<T extends Component>(
  animatedRef: AnimatedRef<T>,
  x: number,
  y: number,
  animated: boolean
) {
  const element = animatedRef();

  // This prevents crashes if ref has not been set yet
  if (element === -1) {
    logger.warn(
      'Called scrollTo() with an uninitialized ref. Make sure to pass the animated ref to the scrollable component before calling scrollTo().'
    );
    return;
  }

  // By ScrollView we mean any scrollable component
  const scrollView = element as unknown as ScrollView;
  scrollView?.scrollTo({ x, y, animated });
}
