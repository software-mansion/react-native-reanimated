/* eslint-disable @typescript-eslint/no-empty-function */

/* eslint-disable @typescript-eslint/no-unused-vars */
import React from 'react';
import { Button, View } from 'react-native';

import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from '../..';

function WithTimingTest() {
  function WithTimingTest1() {
    const width = useSharedValue(50);
    const style = useAnimatedStyle(() => {
      return {
        width: withTiming(
          width.value,
          {
            duration: 500,
            easing: Easing.bezierFn(0.25, 0.1, 0.25, 1),
          },
          (finished) => {}
        ),
      };
    });
    return (
      <View>
        <Animated.View style={style} />
        <Button
          onPress={() => (width.value = Math.random() * 300)}
          title="Hey"
        />
      </View>
    );
  }

  function WithTimingTestToValueAsColor() {
    const style = useAnimatedStyle(() => {
      return {
        backgroundColor: withTiming(
          'rgba(255,105,180,0)',
          {
            duration: 500,
            easing: Easing.bezierFn(0.25, 0.1, 0.25, 1),
          },
          (_finished) => {}
        ),
      };
    });

    return (
      <View>
        <Animated.View style={style} />
      </View>
    );
  }
}
