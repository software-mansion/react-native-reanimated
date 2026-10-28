'use strict';

import { scheduleOnRN, scheduleOnUI } from 'react-native-worklets';

import {
  processColorsInProps,
  processStylePropInPlace,
  processTransform,
  processTransformOrigin,
  stylePropsBuilder,
} from '../common';
import type {
  ShadowNodeWrapper,
  StyleProps,
  ViewDescriptorsWrapper,
} from '../commonTypes';
import type {
  JSPropsOperation,
  PropUpdates,
} from '../createAnimatedComponent/commonTypes';
import jsPropsUpdater from '../createAnimatedComponent/JSPropsUpdater';
import { getStaticFeatureFlag } from '../featureFlags';

const USE_ANIMATION_BACKEND = getStaticFeatureFlag('USE_ANIMATION_BACKEND');

const updateProps: (
  viewDescriptors: ViewDescriptorsWrapper,
  updates: PropUpdates,
  isAnimatedProps?: boolean
) => void = (viewDescriptors, updates, isAnimatedProps = false) => {
  'worklet';

  // TODO: Remove this if once we have SVG props builder implemented
  // We need to keep it for now to prevent regression in SVG props processing
  if (isAnimatedProps) {
    processColorsInProps(updates);
    if ('transformOrigin' in updates) {
      processStylePropInPlace(
        updates,
        'transformOrigin',
        processTransformOrigin
      );
    }
    if ('transform' in updates) {
      processStylePropInPlace(updates, 'transform', processTransform);
    }
  }

  global.UpdatePropsManager.update(
    viewDescriptors,
    // Use props builder only for style updaters, since animated props
    // can contain any properties of different types, depending on the
    // component, which we cannot process properly with the props builder.
    isAnimatedProps ? updates : stylePropsBuilder.build(updates),
    isAnimatedProps
  );
};

export default updateProps;

function updateJSProps(operations: JSPropsOperation[]) {
  jsPropsUpdater.updateProps(operations);
}

type NativePropsOperation = {
  shadowNodeWrapper: ShadowNodeWrapper;
  updates: StyleProps;
  isAnimatedProps: boolean;
};

function createUpdatePropsManager() {
  'worklet';
  const nativeOperations: NativePropsOperation[] = [];
  let jsOperations: JSPropsOperation[] = [];

  let flushPending = false;

  const processViewUpdates = (
    tag: number,
    updates: PropUpdates
  ): {
    nativePropUpdates?: PropUpdates;
    jsPropUpdates?: PropUpdates;
  } => {
    const jsPropNames = global._tagToJSPropNamesMapping[tag];
    if (!jsPropNames) {
      // Fast path for the common case of a view without JS props: hand the
      // updates over as they are instead of copying them every frame.
      for (const _ in updates) {
        return { nativePropUpdates: updates };
      }
      return {};
    }
    let nativePropUpdates: Record<string, unknown> | undefined;
    let jsPropUpdates: Record<string, unknown> | undefined;
    for (const propName in updates) {
      if (jsPropNames[propName]) {
        jsPropUpdates ??= {};
        jsPropUpdates[propName] = (updates as Record<string, unknown>)[
          propName
        ];
      } else {
        nativePropUpdates ??= {};
        nativePropUpdates[propName] = (updates as Record<string, unknown>)[
          propName
        ];
      }
    }
    return { nativePropUpdates, jsPropUpdates };
  };

  return {
    update(
      viewDescriptors: ViewDescriptorsWrapper,
      updates: PropUpdates,
      isAnimatedProps: boolean
    ) {
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
            isAnimatedProps,
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
