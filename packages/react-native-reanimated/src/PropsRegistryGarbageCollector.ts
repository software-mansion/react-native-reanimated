'use strict';

import type { IAnimatedComponentInternal } from './createAnimatedComponent/commonTypes';
import { ReanimatedModule } from './ReanimatedModule';

const FLUSH_INTERVAL_MS = 1000; // 1 second

export const PropsRegistryGarbageCollector = {
  viewsCount: 0,
  viewsMap: new Map<number, IAnimatedComponentInternal>(),
  intervalId: null as NodeJS.Timeout | null,

  registerView(viewTag: number, component: IAnimatedComponentInternal) {
    console.log('registerView', viewTag);
    this.viewsMap.set(viewTag, component);
    this.viewsCount++;
    if (this.viewsCount === 1) {
      this.registerInterval();
    }
  },

  unregisterView(viewTag: number) {
    console.log('unregisterView', viewTag);
    this.viewsMap.delete(viewTag);
    this.viewsCount--;
    if (this.viewsCount === 0) {
      this.unregisterInterval();
    }
  },

  syncPropsBackToReact() {
    console.log('syncPropsBackToReact', performance.now());
    const settledUpdates = ReanimatedModule.getSettledUpdates();
    for (const { viewTag, styleProps } of settledUpdates) {
      const component = this.viewsMap.get(viewTag);
      // TODO: unprocessColor
      // TODO: fix boxShadow artifact visible in BubblesExample
      console.log(
        '_syncStylePropsBackToReact',
        styleProps,
        'for viewTag',
        viewTag
      );
      component?._syncStylePropsBackToReact(styleProps);
    }
  },

  registerInterval() {
    console.log('registerInterval');
    this.intervalId = setInterval(
      this.syncPropsBackToReact.bind(this),
      FLUSH_INTERVAL_MS
    );
  },

  unregisterInterval() {
    console.log('unregisterInterval');
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  },
};
