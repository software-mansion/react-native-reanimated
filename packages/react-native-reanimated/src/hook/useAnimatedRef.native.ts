'use strict';
import { useState } from 'react';
import type { HostInstance } from 'react-native';
import {
  createShareable,
  hasSerializableMapping,
  scheduleOnUI,
  setSerializableMapping,
  UIRuntimeId,
} from 'react-native-worklets';

import type { InstanceOrElement, ShadowNodeWrapper } from '../commonTypes';
import { getShadowNodeWrapperFromRef } from '../fabricUtils';
import { ReanimatedModule } from '../ReanimatedModule';
import type { AnimatedRef, AnimatedRefOnUI } from './commonTypes';
import { useAnimatedRefBase } from './useAnimatedRefCommon';

/**
 * Lets you get a reference of a view that you can use inside a worklet.
 *
 * @returns An object with a `.current` property which contains an instance of
 *   the reference object.
 * @see https://docs.swmansion.com/react-native-reanimated/docs/core/useAnimatedRef
 */
export function useAnimatedRef<
  TRef extends InstanceOrElement = HostInstance,
>(): AnimatedRef<TRef> {
  const [sharedWrapper] = useState(() =>
    createShareable<ShadowNodeWrapper | null>(UIRuntimeId, null)
  );

  const resultRef = useAnimatedRefBase<TRef>(
    (ref) => {
      const currentWrapper = getShadowNodeWrapperFromRef(ref);
      const uiWrapper =
        ReanimatedModule.createUIShadowNodeWrapper(currentWrapper);

      scheduleOnUI(() => {
        (sharedWrapper as AnimatedRefOnUI).value = uiWrapper;
      });

      return currentWrapper;
    },
    () => {
      scheduleOnUI(() => {
        (sharedWrapper as AnimatedRefOnUI).value = null;
      });
    }
  );

  if (!hasSerializableMapping(resultRef)) {
    setSerializableMapping(resultRef, sharedWrapper);
  }

  return resultRef;
}
