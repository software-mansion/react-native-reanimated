/* eslint-disable @typescript-eslint/no-redundant-type-constituents, @typescript-eslint/no-explicit-any */
'use strict';

import { runOnUI } from 'react-native-worklets';
import { processColorsInProps } from "../Colors.js";
import { ReanimatedError } from "../errors.js";
import { isJest, shouldBeUseWeb } from "../PlatformChecker.js";
import { _updatePropsJS } from "../ReanimatedModule/js-reanimated/index.js";
import { processTransformOrigin } from "./processTransformOrigin.js";
let updateProps;
if (shouldBeUseWeb()) {
  updateProps = (viewDescriptors, updates, isAnimatedProps) => {
    'worklet';

    viewDescriptors.value?.forEach(viewDescriptor => {
      const component = viewDescriptor.tag;
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
function createUpdatePropsManager() {
  'worklet';

  const operations = [];
  return {
    update(viewDescriptors, updates) {
      viewDescriptors.value.forEach(viewDescriptor => {
        operations.push({
          shadowNodeWrapper: viewDescriptor.shadowNodeWrapper,
          updates
        });
        if (operations.length === 1) {
          queueMicrotask(this.flush);
        }
      });
    },
    flush() {
      global._updateProps(operations);
      operations.length = 0;
    }
  };
}
if (shouldBeUseWeb()) {
  const maybeThrowError = () => {
    // Jest attempts to access a property of this object to check if it is a Jest mock
    // so we can't throw an error in the getter.
    if (!isJest()) {
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