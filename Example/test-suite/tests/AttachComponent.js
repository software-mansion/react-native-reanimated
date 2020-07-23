'use strict';
import { mount } from './helpers';
import React from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  getViewProp,
} from 'react-native-reanimated';
import { findNodeHandle } from 'react-native'

export const name = 'AttachComponent';

const waitFor = async (conditionalCallback, errorMessage, timeout) => {
  const MAX_WAIT_CYCLES = 10;
  let counter = 0;
  return new Promise((resolve, reject) => {
    const interv = setInterval(() => {
      if (conditionalCallback()) {
        resolve(true)
        clearInterval(interv);
      }
      if (++counter > MAX_WAIT_CYCLES) {
        clearInterval(interv);
        reject(new Error(errorMessage))
      }
    }, timeout / MAX_WAIT_CYCLES);
  });
}

const Comp = ({ viewRef, callbackRef }) => {
  const opacity = useSharedValue(0.1)
  const uas = useAnimatedStyle(() => {
    return {
      width: 100,
      height: 50,
      opacity: opacity.value,
    }
  })

  callbackRef.current = async (newOp) => {
    opacity.value = newOp
    // make sure shared value has been set
    return waitFor(() => (opacity.value === newOp), 'failed to set shared value `opacity`', 1000)
  }
  
  return <Animated.View style={ uas } ref={ viewRef } />;
}

export async function test(t, { setPortalChild, cleanupPortal }) {
  t.describe('AttachComponent', () => {

    t.afterEach(async () => {
      await cleanupPortal();
    });

    t.it('attach component', async () => {
      const viewRef = React.createRef()
      const callbackRef = React.createRef()

      await mount(<Comp viewRef={ viewRef } callbackRef={ callbackRef } />, setPortalChild);
      // make sure both ref are set properly
      const refSet = await waitFor(
        () => (viewRef.current !== null && callbackRef.current !== null),
        'failed to set ref',
        1000)
      t.expect(refSet).toBe(true)
      // check opacity of Animated.View in Comp
      const viewTag = findNodeHandle(viewRef.current)
      t.expect(viewTag).not.toBe(null)
      for(let i = 0.1; i <= 1; i += 0.1) {
        let expectedOp = i
        const svSet = await callbackRef.current(expectedOp)
        t.expect(svSet).toBe(true)
        let opacity = await getViewProp(viewTag, 'opacity')
        // fix the numbers
        opacity = parseFloat(opacity).toFixed(1)
        expectedOp = parseFloat(expectedOp).toFixed(1)
        t.expect(opacity).toBe(expectedOp)
      }
    });

  })

}
