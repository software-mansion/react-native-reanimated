'use strict';
import { mount, waitForDetailed } from './helpers';
import React from 'react';
import {
  useAnimatedRef,
  runOnUI,
  getTag,
  useSharedValue,
} from 'react-native-reanimated';
import { View } from 'react-native';

export const name = 'AnimatedRef';

const Comp = ({ refWrapper }) => {
  const animatedRef = useAnimatedRef();
  const uiFlag = useSharedValue(0);
  refWrapper.current = { animatedRef, uiFlag };

  return <View ref={animatedRef} />;
};

export async function test(t, { setPortalChild, cleanupPortal }) {
  t.describe('useAnimatedRef', () => {
    t.afterEach(async () => {
      await cleanupPortal();
    });

    t.it('attach component', async () => {
      const refWrapper = React.createRef();

      await mount(<Comp refWrapper={refWrapper} />, setPortalChild);
      // make sure both ref are set properly
      const refSet = await waitForDetailed(
        () => refWrapper.current !== null,
        'failed to set ref',
        1000
      );
      t.expect(refSet).toBe(true);
      // test the component
      const animatedRef = refWrapper.current.animatedRef;

      const viewTag = getTag(animatedRef.current);
      runOnUI(() => {
        'worklet';
        const uiViewTag = animatedRef();
        if (uiViewTag === viewTag) {
          refWrapper.current.uiFlag.value = 1;
        }
      })();

      const uiPassed = await waitForDetailed(
        () => refWrapper.current.uiFlag.value === 1,
        'view tag differs on js/ui thread',
        1000
      );

      const refNode = refWrapper.current.animatedRef.current;
      const isValidNode = refNode && typeof refNode._nativeTag === 'number';

      t.expect(uiPassed).toBe(true);
      t.expect(isValidNode).toBe(true);
    });
  });
}
