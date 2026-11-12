'use strict';

import type { AppStateStatus, EventSubscription } from 'react-native';
import { AppState } from 'react-native';

import type {
  ProcessedBackgroundImageValue,
  ProcessedColorStop,
  ProcessedDirection,
} from './common/style/processors/backgroundImage';
import type { ProcessedColor } from './common/style/processors/colors';
import {
  unprocessColor,
  unprocessColorsInProps,
} from './common/style/processors/colors';
import { unprocessObjectFit } from './common/style/processors/image';
import { unprocessVerticalAlign } from './common/style/processors/text';
import type { SettledUpdate } from './commonTypes';
import type { IAnimatedComponentInternal } from './createAnimatedComponent/commonTypes';
import { ReanimatedModule } from './ReanimatedModule';

const FLUSH_INTERVAL_MS = 500;

export const PropsRegistryGarbageCollector = {
  viewsMap: new Map<number, IAnimatedComponentInternal>(),
  intervalId: null as NodeJS.Timeout | null,
  appStateSubscription: null as EventSubscription | null,

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
    const deleted = this.viewsMap.delete(viewTag);
    if (deleted && this.viewsMap.size === 0) {
      this.unregisterInterval();
    }
  },

  syncPropsBackToReact() {
    const settledUpdates = ReanimatedModule.getSettledUpdates([
      ...this.viewsMap.keys(),
    ]);
    for (const settledUpdate of settledUpdates) {
      const { viewTag, props, style } = settledUpdate;
      const component = this.viewsMap.get(viewTag);
      unprocessSettledUpdate(settledUpdate);
      component?._syncStylePropsBackToReact(props, style);
    }
  },

  registerInterval() {
    if (
      AppState.currentState !== 'inactive' &&
      AppState.currentState !== 'background'
    ) {
      this.startInterval();
    }
    // Pause flushing while the app isn't active (e.g. behind a system prompt),
    // otherwise the interval keeps native timers busy the whole time.
    this.appStateSubscription = AppState.addEventListener('change', (state) =>
      this.handleAppStateChange(state)
    );
  },

  unregisterInterval() {
    this.stopInterval();
    this.appStateSubscription?.remove();
    this.appStateSubscription = null;
  },

  handleAppStateChange(state: AppStateStatus) {
    if (state === 'active') {
      // Flush updates that settled while the app wasn't active.
      this.syncPropsBackToReact();
      this.startInterval();
    } else {
      this.stopInterval();
    }
  },

  startInterval() {
    if (this.intervalId === null) {
      this.intervalId = setInterval(
        this.syncPropsBackToReact.bind(this),
        FLUSH_INTERVAL_MS
      );
    }
  },

  stopInterval() {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  },
};

export function unprocessSettledUpdate({
  props,
  style,
  keysLastWrittenByAnimatedStyle,
}: Omit<SettledUpdate, 'viewTag'>) {
  unprocessColorsInProps(props);
  unprocessColorsInProps(style);
  for (const key of keysLastWrittenByAnimatedStyle) {
    const unprocess = STYLE_BUILDER_VALUE_UNPROCESSORS[key];
    if (!unprocess) {
      continue;
    }
    for (const settledValues of [props, style]) {
      if (key in settledValues) {
        settledValues[key] = unprocess(settledValues[key]);
      }
    }
  }
  if (keysLastWrittenByAnimatedStyle.includes('resizeMode')) {
    unprocessObjectFit(style);
  }
  if (keysLastWrittenByAnimatedStyle.includes('textAlignVertical')) {
    unprocessVerticalAlign(style);
  }
}

const STYLE_BUILDER_VALUE_UNPROCESSORS: Partial<
  Record<string, (value: unknown) => unknown>
> = {
  boxShadow: unprocessBoxShadow,
  backgroundImage: unprocessBackgroundImage,
  // eslint-disable-next-line eslint-core/camelcase
  experimental_backgroundImage: unprocessBackgroundImage,
};

function unprocessBoxShadow(value: unknown) {
  if (!Array.isArray(value)) {
    return value;
  }
  return (value as { color: ProcessedColor }[]).map((boxShadow) => ({
    ...boxShadow,
    color: unprocessColor(boxShadow.color),
  }));
}

function unprocessBackgroundImage(value: unknown) {
  if (!Array.isArray(value)) {
    return value;
  }
  return (value as ProcessedBackgroundImageValue[]).map((backgroundImage) => {
    const colorStops = backgroundImage.colorStops.map(unprocessColorStop);
    if (backgroundImage.type === 'linear-gradient') {
      return {
        ...backgroundImage,
        direction: unprocessDirection(backgroundImage.direction),
        colorStops,
      };
    }
    return { ...backgroundImage, colorStops };
  });
}

function unprocessDirection({ type, value }: ProcessedDirection) {
  return type === 'angle' ? `${value}deg` : value;
}

function unprocessColorStop({ color, position }: ProcessedColorStop) {
  return {
    color: color === null ? null : unprocessColor(color),
    positions: position === null ? undefined : [position],
  };
}
