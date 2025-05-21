/* eslint-disable @typescript-eslint/no-redundant-type-constituents, @typescript-eslint/no-explicit-any */
'use strict';

import type { MutableRefObject } from 'react';
import { runOnUI } from 'react-native-worklets';

import { processColorsInProps } from '../Colors';
import type {
  AnimatedStyle,
  ShadowNodeWrapper,
  StyleProps,
} from '../commonTypes';
import { ReanimatedError } from '../errors';
import type { Descriptor } from '../hook/commonTypes';
import { isJest, shouldBeUseWeb } from '../PlatformChecker';
import type { ReanimatedHTMLElement } from '../ReanimatedModule/js-reanimated';
import { _updatePropsJS } from '../ReanimatedModule/js-reanimated';
import { processTransformOrigin } from './processTransformOrigin';

// eslint-disable-next-line @ericcornelissen/top/no-top-level-variables
let updateProps: (
  viewDescriptors: ViewDescriptorsWrapper,
  updates: StyleProps | AnimatedStyle<any>,
  isAnimatedProps?: boolean
) => void;

// eslint-disable-next-line @ericcornelissen/top/no-top-level-side-effects
if (shouldBeUseWeb()) {
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
      viewDescriptors.value.forEach((viewDescriptor) => {
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

// eslint-disable-next-line @ericcornelissen/top/no-top-level-side-effects
if (shouldBeUseWeb()) {
  const maybeThrowError = () => {
    // Jest attempts to access a property of this object to check if it is a Jest mock
    // so we can't throw an error in the getter.
    if (!isJest()) {
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
