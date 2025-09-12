'use strict';
import { logger } from '../common';
import type { MeasuredDimensions, WrapperRef } from '../commonTypes';
import type { AnimatedRef } from '../hook/commonTypes';

export function measure<TRef extends WrapperRef>(
  animatedRef: AnimatedRef<TRef>
): MeasuredDimensions | null {
  const element = animatedRef() as HTMLElement | null;

  if (!element) {
    logger.warn(
      `The view with tag ${element} is not a valid argument for measure(). This may be because the view is not currently rendered, which may not be a bug (e.g. an off-screen FlatList item).`
    );
    return null;
  }

  const viewportOffset = element.getBoundingClientRect();
  return {
    width: element.offsetWidth,
    height: element.offsetHeight,
    x: element.offsetLeft,
    y: element.offsetTop,
    pageX: viewportOffset.left,
    pageY: viewportOffset.top,
  };
}
