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
import AnimatedComponent from '../createAnimatedComponent/AnimatedComponent';
import type {
  JSPropsOperation,
  PropUpdates,
} from '../createAnimatedComponent/commonTypes';
import type { Descriptor } from '../hook/commonTypes';
import type { ReanimatedHTMLElement } from '../ReanimatedModule/js-reanimated';
import { _updatePropsJS } from '../ReanimatedModule/js-reanimated';

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
      _updatePropsJS(updates, component, isAnimatedProps);
    });
  };
} else {
  updateProps = (viewDescriptors, updates) => {
    'worklet';
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

function updateJSProps(operations: JSPropsOperation[]) {
  AnimatedComponent.jsPropsUpdater.updateProps(operations);
}

type NativePropsOperation = {
  shadowNodeWrapper: ShadowNodeWrapper;
  updates: StyleProps;
};

function createUpdatePropsManager() {
  'worklet';
  const nativeOperations: NativePropsOperation[] = [];
  const jsOperations: JSPropsOperation[] = [];

  let flushPending = false;

  return {
    update(viewDescriptors: ViewDescriptorsWrapper, updates: PropUpdates) {
      viewDescriptors.value.forEach(({ tag, shadowNodeWrapper }) => {
        const viewTag = tag as number;

        const nativePropUpdates: PropUpdates = {};
        const jsPropUpdates: PropUpdates = {};

        let hasNativeUpdates = false;
        let hasJSUpdates = false;

        Object.entries(updates).forEach(([propName, value]) => {
          if (global._tagToJSPropNamesMapping[viewTag]?.[propName]) {
            jsPropUpdates[propName] = value;
            hasJSUpdates = true;
          } else {
            nativePropUpdates[propName] = value;
            hasNativeUpdates = true;
          }
        });

        if (hasNativeUpdates) {
          nativeOperations.push({
            shadowNodeWrapper,
            updates: nativePropUpdates,
          });
        }
        if (hasJSUpdates) {
          jsOperations.push({
            tag: tag as number,
            updates: jsPropUpdates,
          });
        }

        if ((hasNativeUpdates || hasJSUpdates) && !flushPending) {
          queueMicrotask(this.flush);
          flushPending = true;
        }
      });
    },
    flush(this: void) {
      if (nativeOperations.length) {
        global._updateProps!(nativeOperations);
        nativeOperations.length = 0;
      }
      if (jsOperations.length) {
        runOnJS(updateJSProps)(jsOperations);
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
