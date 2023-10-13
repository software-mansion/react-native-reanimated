'use strict';
import type { MeasuredDimensions, ShadowNodeWrapper } from '../commonTypes';
import { isChromeDebugger, isJest, shouldBeUseWeb } from '../PlatformChecker';
import type { AnimatedRef } from '../hook/commonTypes';
import type { Component } from 'react';

const IS_NATIVE = !shouldBeUseWeb();

export let measure: <T extends Component>(
  animatedRef: AnimatedRef<T>
) => MeasuredDimensions | null;

if (isJest()) {
  measure = () => {
    console.warn('[Reanimated] measure() cannot be used with Jest.');
    return null;
  };
} else if (isChromeDebugger()) {
  measure = () => {
    console.warn('[Reanimated] measure() cannot be used with Chrome Debugger.');
    return null;
  };
} else if (IS_NATIVE) {
  measure = (animatedRef) => {
    'worklet';
    if (!_WORKLET) {
      return null;
    }

    const viewTag = (animatedRef as any)();
    if (viewTag === -1) {
      console.warn(
        `[Reanimated] The view with tag ${viewTag} is not a valid argument for measure(). This may be because the view is not currently rendered, which may not be a bug (e.g. an off-screen FlatList item).`
      );
      return null;
    }

    const measured = global._IS_FABRIC
      ? // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        _measureFabric!(viewTag as ShadowNodeWrapper)
      : // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        _measurePaper!(viewTag as number);
    if (measured === null) {
      console.warn(
        `[Reanimated] The view with tag ${viewTag} has some undefined, not-yet-computed or meaningless value of \`LayoutMetrics\` type. This may be because the view is not currently rendered, which may not be a bug (e.g. an off-screen FlatList item).`
      );
      return null;
    } else if (measured.x === -1234567) {
      console.warn(
        `[Reanimated] The view with tag ${viewTag} returned an invalid measurement response. Please make sure the view is currently rendered.`
      );
      return null;
    } else if (isNaN(measured.x)) {
      console.warn(
        `[Reanimated] The view with tag ${viewTag} gets view-flattened on Android. To disable view-flattening, set \`collapsable={false}\` on this component.`
      );
      return null;
    } else {
      return measured;
    }
  };
} else {
  measure = () => {
    console.warn(
      '[Reanimated] measure() is not supported on this configuration.'
    );
    return null;
  };
}
