/* eslint-disable @typescript-eslint/no-empty-function */

/* eslint-disable @typescript-eslint/no-unused-vars */
import React from 'react';
import { View } from 'react-native';

import Animated, { useAnimatedStyle, withSpring } from '../..';

function WithSpringTest() {
  function WithSpringTestToValueAsColor() {
    const style = useAnimatedStyle(() => {
      return {
        backgroundColor: withSpring(
          'rgba(255,105,180,0)',
          {},
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
