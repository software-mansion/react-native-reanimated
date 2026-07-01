'use strict';

import { scheduleOnRN, scheduleOnUI } from 'react-native-worklets';

import {
  unprocessColor,
  unprocessColorsInProps,
} from './common/style/processors/colors';
import type { StyleProps } from './commonTypes';
import type { IAnimatedComponentInternal } from './createAnimatedComponent/commonTypes';
import { ReanimatedModule } from './ReanimatedModule';

const FLUSH_INTERVAL_MS = 500;

export const PropsRegistryGarbageCollector = {
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
    if (this.viewsMap.size === 1) {
      this.registerInterval();
    }
  },

  unregisterView(viewTag: number) {
    // `delete` returns false when the tag wasn't tracked (the nested-component
    // case registerView skipped above); bail to keep the count symmetric.
    if (!this.viewsMap.delete(viewTag)) {
      return;
    }
    if (this.viewsMap.size === 0) {
      this.unregisterInterval();
      scheduleOrphanedPropsCleanup();
    }
  },

  syncPropsBackToReact() {
    const settledUpdates = ReanimatedModule.getSettledUpdates();
    for (const { viewTag, styleProps } of settledUpdates) {
      if (styleProps === null) {
        continue;
      }
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

// The last animated view just unmounted, so the GC interval has stopped and no
// commit will drain the registry. An in-flight animation frame can still re-add
// the view's props; wait one UI frame for it to run, then clear the registry.
function scheduleOrphanedPropsCleanup() {
  scheduleOnUI(() => {
    'worklet';
    requestAnimationFrame(() => {
      'worklet';
      scheduleOnRN(removeOrphanedProps);
    });
  });
}

function removeOrphanedProps() {
  if (PropsRegistryGarbageCollector.viewsMap.size === 0) {
    ReanimatedModule.removeOrphanedProps();
  }
}

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
