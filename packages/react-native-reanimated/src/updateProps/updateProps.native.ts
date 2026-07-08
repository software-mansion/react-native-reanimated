'use strict';

import { scheduleOnRN, scheduleOnUI } from 'react-native-worklets';

import {
  IS_JEST,
  processColorsInProps,
  processTransform,
  processTransformOrigin,
  stylePropsBuilder,
} from '../common';
import { processBoxShadowWeb, processFilterWeb } from '../common/web';
import type { ShadowNodeWrapper, StyleProps } from '../commonTypes';
import type {
  JSPropsOperation,
  PropUpdates,
} from '../createAnimatedComponent/commonTypes';
import jsPropsUpdater from '../createAnimatedComponent/JSPropsUpdater';
import { getStaticFeatureFlag } from '../featureFlags';
import type { ReanimatedHTMLElement } from '../ReanimatedModule/js-reanimated';
import { _updatePropsJS } from '../ReanimatedModule/js-reanimated';
import type { ViewDescriptorsWrapper } from './updatePropsBase';
import { makeUpdatePropsJestWrapper, maybeThrowError } from './updatePropsBase';

const USE_ANIMATION_BACKEND = getStaticFeatureFlag('USE_ANIMATION_BACKEND');

let updateProps: (
  viewDescriptors: ViewDescriptorsWrapper,
  updates: PropUpdates,
  isAnimatedProps?: boolean
) => void;

// is-tree-shakable-suppress
if (IS_JEST) {
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
  updateProps = (viewDescriptors, updates, isAnimatedProps) => {
    'worklet';

    // TODO: Remove this if once we have SVG props builder implemented
    // We need to keep it for now to prevent regression in SVG props processing
    if (isAnimatedProps) {
      processColorsInProps(updates);
      if ('transformOrigin' in updates) {
        updates.transformOrigin = processTransformOrigin(
          updates.transformOrigin
        );
      }
      if ('transform' in updates) {
        updates.transform = processTransform(updates.transform);
      }
    }

    global.UpdatePropsManager.update(
      viewDescriptors,
      // Use props builder only for style updaters, since animated props
      // can contain any properties of different types, depending on the
      // component, which we cannot process properly with the props builder.
      isAnimatedProps ? updates : stylePropsBuilder.build(updates)
    );
  };
}

export const updatePropsJestWrapper = makeUpdatePropsJestWrapper(updateProps);

export default updateProps;

function updateJSProps(operations: JSPropsOperation[]) {
  jsPropsUpdater.updateProps(operations);
}

type NativePropsOperation = {
  shadowNodeWrapper: ShadowNodeWrapper;
  updates: StyleProps;
};

function createUpdatePropsManager() {
  'worklet';
  const nativeOperations: NativePropsOperation[] = [];
  let jsOperations: JSPropsOperation[] = [];

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
          });
        }
        if (jsPropUpdates) {
          jsOperations.push({
            tag: viewTag,
            updates: jsPropUpdates,
          });
        }

        if (!flushPending && (nativePropUpdates || jsPropUpdates)) {
          global.__requestMapperRunFinalizer(this.flush);
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
        // Fresh array each flush: scheduleOnRN caches serialized args by identity.
        scheduleOnRN(updateJSProps, jsOperations);
        jsOperations = [];
      }
      flushPending = false;
      if (!USE_ANIMATION_BACKEND) {
        global._maybeFlushUIUpdatesQueue();
      }
    },
  };
}

// is-tree-shakable-suppress
if (IS_JEST) {
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
