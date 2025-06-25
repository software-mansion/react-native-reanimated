/* eslint-disable @typescript-eslint/no-redundant-type-constituents, @typescript-eslint/no-explicit-any */
'use strict';

import type { MutableRefObject } from 'react';
import { runOnUI } from 'react-native-worklets';

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

function createUpdatePropsManager() {
  'worklet';
  const operations: {
    shadowNodeWrapper: ShadowNodeWrapper;
    updates: StyleProps | AnimatedStyle<any>;
  }[] = [];
  return {
    update(
      viewDescriptors: ViewDescriptorsWrapper,
      updates: StyleProps | AnimatedStyle<any>
    ) {
      viewDescriptors.value.forEach((viewDescriptor: Descriptor) => {
        operations.push({
          shadowNodeWrapper: viewDescriptor.shadowNodeWrapper,
          updates,
        });
        if (operations.length === 1) {
          queueMicrotask(this.flush);
        }
      });
    },
    flush(this: void) {
      global._updateProps!(operations);
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
