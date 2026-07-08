'use strict';
import { useState } from 'react';
import type { HostInstance } from 'react-native';
import {
  createSerializable,
  serializableMappingCache,
} from 'react-native-worklets';

import { IS_JEST } from '../common/constants';
import type { InstanceOrElement, ShadowNodeWrapper } from '../commonTypes';
import { getShadowNodeWrapperFromRef } from '../fabricUtils';
import { makeMutable } from '../mutables';
import type { AnimatedRef, AnimatedRefOnUI } from './commonTypes';
import { useAnimatedRefBase, useAnimatedRefWeb } from './useAnimatedRefBase';

function useAnimatedRefNative<
  TRef extends InstanceOrElement = HostInstance,
>(): AnimatedRef<TRef> {
  const [sharedWrapper] = useState(() =>
    makeMutable<ShadowNodeWrapper | null>(null)
  );

  const resultRef = useAnimatedRefBase<TRef>((ref) => {
    const currentWrapper = getShadowNodeWrapperFromRef(ref);

    sharedWrapper.value = currentWrapper;

    return currentWrapper;
  });

  if (!serializableMappingCache.get(resultRef)) {
    const animatedRefSerializableHandle = createSerializable({
      __init: (): AnimatedRefOnUI => {
        'worklet';
        return () => sharedWrapper.value;
      },
    });
    serializableMappingCache.set(resultRef, animatedRefSerializableHandle);
  }

  return resultRef;
}

/**
 * Lets you get a reference of a view that you can use inside a worklet.
 *
 * @returns An object with a `.current` property which contains an instance of
 *   the reference object.
 * @see https://docs.swmansion.com/react-native-reanimated/docs/core/useAnimatedRef
 */
export const useAnimatedRef = IS_JEST
  ? useAnimatedRefWeb
  : useAnimatedRefNative;
