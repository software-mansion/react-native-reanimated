/* eslint-disable @typescript-eslint/no-explicit-any */
'use strict';

import { runOnJS, runOnUI } from 'react-native-worklets';
import { IS_JEST, processBoxShadowNative, processBoxShadowWeb, processColorsInProps, processTransformOrigin, ReanimatedError, SHOULD_BE_USE_WEB } from '../common';
import jsPropsUpdater from '../createAnimatedComponent/JSPropsUpdater';
import { _updatePropsJS } from '../ReanimatedModule/js-reanimated';
let updateProps;
if (SHOULD_BE_USE_WEB) {
  updateProps = (viewDescriptors, updates, isAnimatedProps) => {
    'worklet';

    viewDescriptors.value?.forEach(viewDescriptor => {
      const component = viewDescriptor.tag;
      if ('boxShadow' in updates) {
        updates.boxShadow = processBoxShadowWeb(updates.boxShadow);
      }
      _updatePropsJS(updates, component, isAnimatedProps);
    });
  };
} else {
  updateProps = (viewDescriptors, updates) => {
    'worklet';

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
    global.UpdatePropsManager.update(viewDescriptors, updates);
  };
}
export const updatePropsJestWrapper = (viewDescriptors, updates, animatedValues, adapters) => {
  adapters.forEach(adapter => {
    adapter(updates);
  });
  animatedValues.current.value = {
    ...animatedValues.current.value,
    ...updates
  };
  updateProps(viewDescriptors, updates);
};
export default updateProps;
function updateJSProps(operations) {
  jsPropsUpdater.updateProps(operations);
}
function createUpdatePropsManager() {
  'worklet';

  const nativeOperations = [];
  const jsOperations = [];
  let flushPending = false;
  const processViewUpdates = (tag, updates) => Object.entries(updates).reduce((acc, [propName, value]) => {
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
    update(viewDescriptors, updates) {
      viewDescriptors.value.forEach(({
        tag,
        shadowNodeWrapper
      }) => {
        const viewTag = tag;
        const {
          nativePropUpdates,
          jsPropUpdates
        } = processViewUpdates(viewTag, updates);
        if (nativePropUpdates) {
          nativeOperations.push({
            shadowNodeWrapper,
            updates: nativePropUpdates
          });
        }
        if (jsPropUpdates) {
          jsOperations.push({
            tag: viewTag,
            updates: jsPropUpdates
          });
        }
        if (!flushPending && (nativePropUpdates || jsPropUpdates)) {
          queueMicrotask(this.flush);
          flushPending = true;
        }
      });
    },
    flush() {
      if (nativeOperations.length) {
        global._updateProps(nativeOperations);
        nativeOperations.length = 0;
      }
      if (jsOperations.length) {
        runOnJS(updateJSProps)(jsOperations);
        jsOperations.length = 0;
      }
      flushPending = false;
    }
  };
}
if (SHOULD_BE_USE_WEB) {
  const maybeThrowError = () => {
    // Jest attempts to access a property of this object to check if it is a Jest mock
    // so we can't throw an error in the getter.
    if (!IS_JEST) {
      throw new ReanimatedError('`UpdatePropsManager` is not available on non-native platform.');
    }
  };
  global.UpdatePropsManager = new Proxy({}, {
    get: maybeThrowError,
    set: () => {
      maybeThrowError();
      return false;
    }
  });
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
//# sourceMappingURL=updateProps.js.map