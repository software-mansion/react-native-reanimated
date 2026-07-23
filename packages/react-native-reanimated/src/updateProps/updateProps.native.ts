'use strict';

import { scheduleOnRN, scheduleOnUI } from 'react-native-worklets';

import {
  processColorsInProps,
  processTransform,
  processTransformOrigin,
  stylePropsBuilder,
} from '../common';
import type { ShadowNodeWrapper, StyleProps } from '../commonTypes';
import type {
  JSPropsOperation,
  PropUpdates,
} from '../createAnimatedComponent/commonTypes';
import jsPropsUpdater from '../createAnimatedComponent/JSPropsUpdater';
import { getStaticFeatureFlag } from '../featureFlags';
import type { ViewDescriptorsWrapper } from './updatePropsCommon';
import { makeUpdatePropsJestWrapper } from './updatePropsCommon';

const USE_ANIMATION_BACKEND = getStaticFeatureFlag('USE_ANIMATION_BACKEND');

const updateProps: (
  viewDescriptors: ViewDescriptorsWrapper,
  updates: PropUpdates,
  isAnimatedProps?: boolean
) => void = (viewDescriptors, updates, isAnimatedProps) => {
  'worklet';

  // TODO: Remove this if once we have SVG props builder implemented
  // We need to keep it for now to prevent regression in SVG props processing
  if (isAnimatedProps) {
    processColorsInProps(updates);
    if ('transformOrigin' in updates) {
      updates.transformOrigin = processTransformOrigin(updates.transformOrigin);
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
scheduleOnUI(() => {
  'worklet';
  global.UpdatePropsManager = createUpdatePropsManager();
});
