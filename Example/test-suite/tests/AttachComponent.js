'use strict';
import { mount } from './helpers';
import React from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

export const name = 'AttachComponent';

const Comp = ({ sendData }) => {
  const sv = useSharedValue(40)
  const uas = useAnimatedStyle(() => {
    return {
      width: 100,
      height: sv.value,
    }
  })
  
  return <Animated.View style={ uas } />;
}

export async function test(t, { setPortalChild, cleanupPortal }) {
  t.describe('AttachComponent', () => {

    t.afterEach(async () => {
      await cleanupPortal();
    });

    t.it('attach component', async () => {
      await mount(<Comp />, setPortalChild);
      // todo check dimensions of Animated.View in Comp
      t.expect(1).toBe(1)
    });

  })

}
