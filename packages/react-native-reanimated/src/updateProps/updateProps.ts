/* eslint-disable @typescript-eslint/no-redundant-type-constituents, @typescript-eslint/no-explicit-any */
'use strict';

import type { MutableRefObject } from 'react';
import { runOnJS, runOnUI } from 'react-native-worklets';

import {
  IS_JEST,
  processColorsInProps,
  processTransformOrigin,
  ReanimatedError,
  SHOULD_BE_USE_WEB,
} from '../common';
import type {
  AnimatedStyle,
  ShadowNodeWrapper,
  StyleProps,
} from '../commonTypes';
import { ComponentRegistry } from '../createAnimatedComponent/ComponentRegistry';
import type { Descriptor } from '../hook/commonTypes';
import type { ReanimatedHTMLElement } from '../ReanimatedModule/js-reanimated';
import { _updatePropsJS } from '../ReanimatedModule/js-reanimated';

let updateProps: (
  viewDescriptors: ViewDescriptorsWrapper,
  updates: StyleProps | AnimatedStyle<any>,
  isAnimatedProps?: boolean
) => void;

if (SHOULD_BE_USE_WEB) {
  updateProps = (viewDescriptors, updates, isAnimatedProps) => {
    'worklet';
    viewDescriptors.value?.forEach((viewDescriptor) => {
      const component = viewDescriptor.tag as ReanimatedHTMLElement;
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

    processColorsInProps(updates);
    if ('transformOrigin' in updates) {
      updates.transformOrigin = processTransformOrigin(updates.transformOrigin);
    }
    global.UpdatePropsManager.update(viewDescriptors, updates);
  };
}

export const updatePropsJestWrapper = (
  viewDescriptors: ViewDescriptorsWrapper,
  updates: AnimatedStyle<any>,
  animatedValues: MutableRefObject<AnimatedStyle<any>>,
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

function updateJSProps(tag: number, props: StyleProps) {
  const component = ComponentRegistry.getComponent(tag);
  if (component) {
    component._updateStylePropsJS(props);
  }
}

function createUpdatePropsManager() {
  'worklet';
  const operations: {
    shadowNodeWrapper: ShadowNodeWrapper;
    updates: StyleProps | AnimatedStyle<any>;
    tag: number;
  }[] = [];

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
      runOnJS(updateJSProps)(tag, update);
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

  return {
    update(
      viewDescriptors: ViewDescriptorsWrapper,
      updates: StyleProps | AnimatedStyle<any>
    ) {
      viewDescriptors.value.forEach((viewDescriptor) => {
        const tag = viewDescriptor.tag as number; // on mobile it should be a number
        operations.push({
          shadowNodeWrapper: viewDescriptor.shadowNodeWrapper,
          updates,
          tag,
        });
        if (operations.length === 1) {
          queueMicrotask(this.flush);
        }
      });
    },
    flush(this: void) {
      global._updateProps!(operations);
      operations.forEach(({ tag }) => {
        'worklet';
        checkUpdate(tag);
      });
      operations.length = 0;
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
  runOnUI(() => {
    'worklet';
    global.UpdatePropsManager = createUpdatePropsManager();
  })();
}

/**
 * This used to be `SharedValue<Descriptors[]>` but objects holding just a
 * single `value` prop are fine too.
 */
interface ViewDescriptorsWrapper {
  value: Readonly<Descriptor[]>;
}
