/* eslint-disable @typescript-eslint/no-explicit-any */
'use strict';

import type { RefObject } from 'react';
import { scheduleOnRN, scheduleOnUI } from 'react-native-worklets';

import {
  IS_JEST,
  processBoxShadowNative,
  processColorsInProps,
  processFilter,
  ReanimatedError,
  SHOULD_BE_USE_WEB,
} from '../common';
import {
  processBoxShadowWeb,
  processFilterWeb,
  processTransformOrigin,
} from '../common/web';
import type {
  AnimatedStyle,
  ShadowNodeWrapper,
  StyleProps,
} from '../commonTypes';
import type {
  JSPropsOperation,
  PropUpdates,
} from '../createAnimatedComponent/commonTypes';
import jsPropsUpdater from '../createAnimatedComponent/JSPropsUpdater';
import type { Descriptor } from '../hook/commonTypes';
import type { ReanimatedHTMLElement } from '../ReanimatedModule/js-reanimated';
import { _updatePropsJS } from '../ReanimatedModule/js-reanimated';
import { ComponentRegistry } from '../createAnimatedComponent/ComponentRegistry';

let updateProps: (
  viewDescriptors: ViewDescriptorsWrapper,
  updates: PropUpdates,
  isAnimatedProps?: boolean
) => void;

if (SHOULD_BE_USE_WEB) {
  updateProps = (viewDescriptors, updates, isAnimatedProps) => {
    'worklet';
    viewDescriptors.value?.forEach((viewDescriptor) => {
      const component = viewDescriptor.tag as ReanimatedHTMLElement;
      if ('boxShadow' in updates) {
        updates.boxShadow = processBoxShadowWeb(updates.boxShadow);
      }
      if ('filter' in updates) {
        updates.filter = processFilterWeb(updates.filter);
      }
      _updatePropsJS(updates, component, isAnimatedProps);
    });
  };
} else {
  updateProps = (viewDescriptors, updates) => {
    'worklet';

    // Important: store the updates before running processing on them
    // the goal is to use these updates later on react JS to set these as style state to the components.
    // processing is alternating the style props as RN expects them.
    viewDescriptors.value.forEach((viewDescriptor) => {
      const prevState =
        global.__lastUpdateByTag[viewDescriptor.tag as number] ?? {};
      global.__lastUpdateByTag[viewDescriptor.tag as number] = {
        ...prevState, // its important to preserve previous state. When multiple style props are animated they might not all appear in one update.
        ...updates, // copy updates as process mutates inline
      };
      global.__lastUpdateFrameTimeByTag[viewDescriptor.tag as number] =
        global.__frameTimestamp;
    });

    /* TODO: Improve this config structure in the future
     * The goal is to create a simplified version of `src/css/platform/native/config.ts`,
     * containing only properties that require processing and their associated processors
     * */
    processColorsInProps(updates);
    if ('transformOrigin' in updates) {
      updates.transformOrigin = processTransformOrigin(updates.transformOrigin);
    }
    if ('boxShadow' in updates) {
      updates.boxShadow = processBoxShadowNative(updates.boxShadow);
    }
    if ('filter' in updates) {
      updates.filter = processFilter(updates.filter);
    }
    global.UpdatePropsManager.update(viewDescriptors, updates);
  };
}

export const updatePropsJestWrapper = (
  viewDescriptors: ViewDescriptorsWrapper,
  updates: AnimatedStyle<any>,
  animatedValues: RefObject<AnimatedStyle<any>>,
  adapters: ((updates: AnimatedStyle<any>) => void)[]
): void => {
  adapters.forEach((adapter) => {
    adapter(updates);
  });
  animatedValues.current.value = {
    ...animatedValues.current.value,
    ...updates,
  };

  updateProps(viewDescriptors, updates);
};

export default updateProps;

function updateJSProps(operations: JSPropsOperation[]) {
  jsPropsUpdater.updateProps(operations);
}

function updateStylePropsJS(tag: number, props: StyleProps) {
  const component = ComponentRegistry.getComponent(tag);
  if (component) {
    component._updateStylePropsJS(props);
  }
}

type NativePropsOperation = {
  shadowNodeWrapper: ShadowNodeWrapper;
  updates: StyleProps;
  tag: number;
};

function createUpdatePropsManager() {
  'worklet';
  const nativeOperations: NativePropsOperation[] = [];
  const jsOperations: JSPropsOperation[] = [];

  const scheduledFrameIds: Record<number, number | undefined> = {};

  function checkUpdate(tag: number) {
    'worklet';

    const currentFrameTime = global.__frameTimestamp;
    const lastUpdateFrameTime = global.__lastUpdateFrameTimeByTag[tag];
    if (!currentFrameTime || !lastUpdateFrameTime) {
      return;
    }

    const update = global.__lastUpdateByTag[tag];
    if (update && currentFrameTime - lastUpdateFrameTime >= 20) {
      // ~ 2x frames
      // Animation appears to have settled - update component props on JS
      scheduleOnRN(updateStylePropsJS, tag, update);
      global.__lastUpdateByTag[tag] = undefined;
      return;
    }

    if (scheduledFrameIds[tag]) {
      // Note: REA/Worklets doesn't support cancelAnimationFrame
      return;
    }

    scheduledFrameIds[tag] = requestAnimationFrame(() => {
      'worklet';
      scheduledFrameIds[tag] = undefined;
      checkUpdate(tag);
    });
  }

  let flushPending = false;

  const processViewUpdates = (tag: number, updates: PropUpdates) =>
    Object.entries(updates).reduce<{
      nativePropUpdates?: PropUpdates;
      jsPropUpdates?: PropUpdates;
    }>((acc, [propName, value]) => {
      if (global._tagToJSPropNamesMapping[tag]?.[propName]) {
        acc.jsPropUpdates ??= {};
        acc.jsPropUpdates[propName] = value;
      } else {
        acc.nativePropUpdates ??= {};
        acc.nativePropUpdates[propName] = value;
      }
      return acc;
    }, {});

  return {
    update(viewDescriptors: ViewDescriptorsWrapper, updates: PropUpdates) {
      viewDescriptors.value.forEach(({ tag, shadowNodeWrapper }) => {
        const viewTag = tag as number;
        const { nativePropUpdates, jsPropUpdates } = processViewUpdates(
          viewTag,
          updates
        );

        if (nativePropUpdates) {
          nativeOperations.push({
            shadowNodeWrapper,
            updates: nativePropUpdates,
            tag: viewTag,
          });
        }
        if (jsPropUpdates) {
          jsOperations.push({
            tag: viewTag,
            updates: jsPropUpdates,
          });
        }

        if (!flushPending && (nativePropUpdates || jsPropUpdates)) {
          queueMicrotask(this.flush);
          flushPending = true;
        }
      });
    },
    flush(this: void) {
      if (nativeOperations.length) {
        global._updateProps!(nativeOperations);
        nativeOperations.forEach(({ tag }) => {
          'worklet';
          checkUpdate(tag);
        });
        nativeOperations.length = 0;
      }
      if (jsOperations.length) {
        scheduleOnRN(updateJSProps, jsOperations);
        jsOperations.length = 0;
      }
      flushPending = false;
    },
  };
}

if (SHOULD_BE_USE_WEB) {
  const maybeThrowError = () => {
    // Jest attempts to access a property of this object to check if it is a Jest mock
    // so we can't throw an error in the getter.
    if (!IS_JEST) {
      throw new ReanimatedError(
        '`UpdatePropsManager` is not available on non-native platform.'
      );
    }
  };
  global.UpdatePropsManager = new Proxy(
    {},
    {
      get: maybeThrowError,
      set: () => {
        maybeThrowError();
        return false;
      },
    }
  );
} else {
  scheduleOnUI(() => {
    'worklet';
    global.UpdatePropsManager = createUpdatePropsManager();
  });
}

/**
 * This used to be `SharedValue<Descriptors[]>` but objects holding just a
 * single `value` prop are fine too.
 */
interface ViewDescriptorsWrapper {
  value: Readonly<Descriptor[]>;
}
