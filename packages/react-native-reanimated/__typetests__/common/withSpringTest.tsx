/* eslint-disable import/no-unresolved */
/* eslint-disable no-unused-expressions */
/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/ban-ts-comment */
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
