'use strict';
import type { ScrollView } from 'react-native';

import { logger } from '../common';
import type { WrapperRef } from '../commonTypes';
import type { AnimatedRef } from '../hook/commonTypes';

export function scrollTo<TRef extends WrapperRef>(
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
  const scrollView = element as unknown as ScrollView;
  scrollView?.scrollTo({ x, y, animated });
}
