'use strict';
import type { MeasuredDimensions, ShadowNodeWrapper } from '../commonTypes';
import {
  isChromeDebugger,
  isFabric,
  isJest,
  shouldBeUseWeb,
} from '../PlatformChecker';
import type { AnimatedRef, AnimatedRefOnUI } from '../hook/commonTypes';
import type { Component } from 'react';

type Measure = <T extends Component>(
  animatedRef: AnimatedRef<T>
) => MeasuredDimensions | null;

export let measure: Measure;

function measureFabric(animatedRef: AnimatedRefOnUI) {
  'worklet';
  if (!_WORKLET) {
    return null;
  }

  const viewTag = animatedRef();
  if (viewTag === -1) {
    console.warn(
      `[Reanimated] The view with tag ${viewTag} is not a valid argument for measure(). This may be because the view is not currently rendered, which may not be a bug (e.g. an off-screen FlatList item).`
    );
    return null;
  }

  const measured = _measureFabric!(viewTag as ShadowNodeWrapper);
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
}

function measurePaper(animatedRef: AnimatedRefOnUI) {
  'worklet';
  if (!_WORKLET) {
    return null;
  }

  const viewTag = animatedRef();
  if (viewTag === -1) {
    console.warn(
      `[Reanimated] The view with tag ${viewTag} is not a valid argument for measure(). This may be because the view is not currently rendered, which may not be a bug (e.g. an off-screen FlatList item).`
    );
    return null;
  }

  const measured = _measurePaper!(viewTag as number);
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
}

function measureJest() {
  console.warn('[Reanimated] measure() cannot be used with Jest.');
  return null;
}

function measureChromeDebugger() {
  console.warn('[Reanimated] measure() cannot be used with Chrome Debugger.');
  return null;
}

function measureDefault() {
  console.warn(
    '[Reanimated] measure() is not supported on this configuration.'
  );
  return null;
}

if (!shouldBeUseWeb()) {
  // Those casts are actually correct since on Native platforms `AnimatedRef` is
  // registered with `RegisterShareableMapping` as a different function than
  // actual `AnimatedRef` and TypeScript cannot know that.
  if (isFabric()) {
    measure = measureFabric as unknown as Measure;
  } else {
    measure = measurePaper as unknown as Measure;
  }
} else if (isJest()) {
  measure = measureJest;
} else if (isChromeDebugger()) {
  measure = measureChromeDebugger;
} else {
  measure = measureDefault;
}
