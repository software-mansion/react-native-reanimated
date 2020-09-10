import React, { FunctionComponent, useEffect, useRef, useState } from 'react'; // we need this to make JSY compile
import { StyleSheet, ViewStyle } from 'react-native';
import { View, Text } from 'react-native';
import Animated, {
  interpolate,
  runOnUI,
  useAnimatedGestureHandler,
  useAnimatedStyle,
  useSharedValue,
  useAnimatedScrollHandler,
} from 'react-native-reanimated';
import { PanGestureHandler } from 'react-native-gesture-handler';
import MaskedView from '@react-native-community/masked-view';
import { clamp } from './util/clamp';
import { useMeasure } from './util/useMeasure';
import { toNearest } from './util/toNearest';
const throttle = require('lodash/throttle');

export default function Screen() {

  const indices = [0,1,2,3,4,5,6,7];

  const baseHeight = 100;
  const headerHeight = useSharedValue(baseHeight);
  const animatedHeaderStyle = useAnimatedStyle(
    () => {
      return {
        height: headerHeight.value,
      }
    }
  ); 

  const handler = useAnimatedScrollHandler({
    onScroll: (e, ctx) => {
      const y = e.contentOffset.y;
      if (y >= 0 && y <= 200) {
        headerHeight.value = baseHeight + y/10;
      } else if ( y < 0 ) {
        headerHeight.value = baseHeight;
      } else {
        headerHeight.value = baseHeight + 200/10;
      }
      console.log(e);
    },
  });

  return (
    <View collapsable={false}>
      <Animated.View style={[styles.header, animatedHeaderStyle]}>
      </Animated.View>
      <Animated.ScrollView onScroll={handler} scrollEventThrottle={16}>
        {
          indices.map((i) => {
            return (
              <View key={i} style={styles.fakeContent}>
                <Text>{i}</Text>
              </View>
            );
          })
        }
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fakeContent: {
    height: 200,
    backgroundColor: 'yellow',
    borderWidth: 1,
    borderColor: 'black',
  },
  header: {
    width: '100%',
    backgroundColor:'blue',
  },
});