'use strict';

import {
  unprocessColor,
  unprocessColorsInProps,
} from './common/style/processors/colors';
import type { StyleProps } from './commonTypes';
import type { IAnimatedComponentInternal } from './createAnimatedComponent/commonTypes';
import { ReanimatedModule } from './ReanimatedModule';

const FLUSH_INTERVAL_MS = 500;

export const PropsRegistryGarbageCollector = {
  viewsCount: 0,
  viewsMap: new Map<number, IAnimatedComponentInternal>(),
  intervalId: null as NodeJS.Timeout | null,

  registerView(viewTag: number, component: IAnimatedComponentInternal) {
    if (this.viewsMap.has(viewTag)) {
      // In case of nested AnimatedComponents (like <GestureDetector> with <Animated.View> inside),
      // `registerView` method is called first for the inner component (e.g. <Animated.View>)
      // and then second time for the outer component (e.g. <GestureDetector>).
      // Both of these components have the same viewTag so the inner component will be overwritten
      // with the outer one. That's why we need to skip the logic during any subsequent calls.
      return;
    }
    this.viewsMap.set(viewTag, component);
    this.viewsCount++;
    if (this.viewsCount === 1) {
      this.registerInterval();
    }
  },

  unregisterView(viewTag: number) {
    this.viewsMap.delete(viewTag);
    this.viewsCount--;
    if (this.viewsCount === 0) {
      this.unregisterInterval();
    }
  },

  syncPropsBackToReact() {
    const settledUpdates = ReanimatedModule.getSettledUpdates();
    for (const { viewTag, styleProps } of settledUpdates) {
      const component = this.viewsMap.get(viewTag);
      unprocessProps(styleProps);
      component?._syncStylePropsBackToReact(styleProps);
    }
  },

  registerInterval() {
    this.intervalId = setInterval(
      this.syncPropsBackToReact.bind(this),
      FLUSH_INTERVAL_MS
    );
  },

  unregisterInterval() {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  },
};

function unprocessProps(props: StyleProps) {
  unprocessColorsInProps(props);
  unprocessBoxShadow(props);
}

function unprocessBoxShadow(props: StyleProps) {
  if (Array.isArray(props.boxShadow)) {
    // @ts-ignore props is readonly
    props.boxShadow = props.boxShadow.map((boxShadow) => ({
      ...boxShadow,
      color: unprocessColor(boxShadow.color),
    }));
  }
}
