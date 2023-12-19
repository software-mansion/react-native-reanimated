'use strict';
import type { MeasuredDimensions } from '../commonTypes';
import type { AnimatedRef } from '../hook/commonTypes';
import type { Component } from 'react';

export function measure<T extends Component>(
  animatedRef: AnimatedRef<T>
): MeasuredDimensions | null {
  const element = (animatedRef as any)();

  if (element === -1) {
    console.warn(
      `[Reanimated] The view with tag ${element} is not a valid argument for measure(). This may be because the view is not currently rendered, which may not be a bug (e.g. an off-screen FlatList item).`
    );
    return null;
  }

  const viewportOffset = (element as HTMLElement).getBoundingClientRect();
  return {
    width: element.offsetWidth,
    height: element.offsetHeight,
    x: element.offsetLeft,
    y: element.offsetTop,
    pageX: viewportOffset.left,
    pageY: viewportOffset.top,
  };
}
