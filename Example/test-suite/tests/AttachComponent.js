'use strict';
import { mount, waitForDetailed } from './helpers';
import React from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  getViewProp,
} from 'react-native-reanimated';
import { findNodeHandle, Platform } from 'react-native';

export const name = 'AttachComponent';

const Comp = ({ viewRef, callbackRef }) => {
  const opacity = useSharedValue(0.1);
  const uas = useAnimatedStyle(() => {
    return {
      width: 100,
      height: 50,
      opacity: opacity.value,
    };
  });

  callbackRef.current = async (newOp) => {
    opacity.value = newOp;
    // make sure shared value has been set
    return waitForDetailed(
      () => opacity.value === newOp,
      'failed to set shared value `opacity`',
      1000
    );
  };

  return <Animated.View style={uas} ref={viewRef} />;
};

export async function test(t, { setPortalChild, cleanupPortal }) {
  t.describe('AttachComponent', () => {
    t.afterEach(async () => {
      await cleanupPortal();
    });

    t.it('attach component', async () => {
      const viewRef = React.createRef();
      const callbackRef = React.createRef();

      await mount(
        <Comp viewRef={viewRef} callbackRef={callbackRef} />,
        setPortalChild
      );
      // make sure both ref are set properly
      const refSet = await waitForDetailed(
        () => viewRef.current !== null && callbackRef.current !== null,
        'failed to set ref',
        1000
      );
      t.expect(refSet).toBe(true);
      // check opacity of Animated.View in Comp
      const viewTag = findNodeHandle(viewRef.current);
      t.expect(viewTag).not.toBe(null);
      // for android perform the loop only once
      let i = Platform.OS === 'android' ? 1 : 0.1;
      do {
        let expectedOp = i;
        const svSet = await callbackRef.current(expectedOp);
        t.expect(svSet).toBe(true);
        let opacity = await getViewProp(viewTag, 'opacity');
        // fix the numbers
        opacity = parseFloat(opacity).toFixed(1);
        expectedOp = parseFloat(expectedOp).toFixed(1);
        t.expect(opacity).toBe(expectedOp);
        i += 0.1;
      } while (i < 1);
    });
  });
}
