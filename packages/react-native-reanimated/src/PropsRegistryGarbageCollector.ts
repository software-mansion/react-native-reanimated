'use strict';

import type {
  ProcessedBackgroundImageValue,
  ProcessedColorStop,
  ProcessedDirection,
} from './common/style/processors/backgroundImage';
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
    const deleted = this.viewsMap.delete(viewTag);
    if (deleted && this.viewsMap.size === 0) {
      this.unregisterInterval();
    }
  },

  syncPropsBackToReact() {
    const settledUpdates = ReanimatedModule.getSettledUpdates([
      ...this.viewsMap.keys(),
    ]);
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

export function unprocessProps(props: StyleProps) {
  unprocessColorsInProps(props);
  unprocessBoxShadow(props);
  unprocessBackgroundImage(props);
  unprocessObjectFit(props);
  unprocessVerticalAlign(props);
}

const RESIZE_MODE_TO_OBJECT_FIT: Record<string, string> = {
  contain: 'contain',
  cover: 'cover',
  stretch: 'fill',
  none: 'none',
};

function unprocessObjectFit(props: StyleProps) {
  const objectFit = RESIZE_MODE_TO_OBJECT_FIT[props.resizeMode as string];
  if (objectFit !== undefined) {
    // @ts-ignore props is readonly
    props.objectFit = objectFit;
  }
}

const TEXT_ALIGN_VERTICAL_TO_VERTICAL_ALIGN: Record<string, string> = {
  auto: 'auto',
  top: 'top',
  bottom: 'bottom',
  center: 'middle',
};

function unprocessVerticalAlign(props: StyleProps) {
  const verticalAlign =
    TEXT_ALIGN_VERTICAL_TO_VERTICAL_ALIGN[props.textAlignVertical as string];
  if (verticalAlign !== undefined) {
    // @ts-ignore props is readonly
    props.verticalAlign = verticalAlign;
  }
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

function unprocessBackgroundImage(props: StyleProps) {
  for (const key of [
    'backgroundImage',
    'experimental_backgroundImage',
  ] as const) {
    const value = props[key];
    if (!Array.isArray(value)) {
      continue;
    }
    // @ts-ignore props is readonly
    props[key] = (value as ProcessedBackgroundImageValue[]).map(
      (backgroundImage) => {
        const colorStops = backgroundImage.colorStops.map(unprocessColorStop);
        if (backgroundImage.type === 'linear-gradient') {
          return {
            ...backgroundImage,
            direction: unprocessDirection(backgroundImage.direction),
            colorStops,
          };
        }
        return { ...backgroundImage, colorStops };
      }
    );
  }
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
