import React, { useRef, useState } from 'react';
import { 
  StyleSheet, 
  View,
  Text,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedGestureHandler,
  scrollTo,
  withTiming,
  getTag,
  Easing,
  useDerivedValue,
} from 'react-native-reanimated';
import { PanGestureHandler } from 'react-native-gesture-handler';

const digits = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const indices = [0, 1, 2, 3];

const range = [0, 9999];

export default function ScrollToScreen() {

  const progress = useSharedValue(0);
  const number = useDerivedValue(
    () => {
      const val = range[0] + Math.round(progress.value * (range[1] - range[0]));
      return val;
    }
  );

  return (
    <SafeAreaView>
      <NumberDisplay number={number} />
      <View>
        <ProgressBar progress={progress} />
      </View>
    </SafeAreaView>
  );
}

function getDigit(number, i) {
  return useDerivedValue(
    () => {
      return (number.value / (10 ** i)) % 10;
    }
  );
}

function NumberDisplay({number}) {
  return (
    <View style={{height: 500}}>
      <View style={{flexDirection: 'row-reverse', justifyContent: "space-between", alignItems: 'center'}}>
        {
          indices.map(i => {
            return (
              <Digit digit={getDigit(number, i)}/>
            ); 
          })
        }
      </View>
    </View>
  );
}

function Digit({digit}) {
  const tag = 5; // TODO
  useDerivedValue(
    () => {
      scrollTo(tag, 0, digit.value * 100, true);
    }
  );

  return (
    <View style={{height: 100}}>
      <ScrollView>
        {
          digits.map(i => {
            return (
              <View style={{height: 100}} >
                <Text>
                  {i}
                </Text>
              </View>
            );
          })
        }
      </ScrollView>
    </View>
  );
}

function ProgressBar ({progress}) {
  const x = useSharedValue(0);
  const max = useSharedValue(0);
  
  const handler = useAnimatedGestureHandler(
    { 
      onStart: (_, ctx) => {
        ctx.x = x.value;
      },
      onActive: (e, ctx) => {
        let newVal = ctx.x + e.translationX;
        newVal = Math.min(max.value, newVal);
        newVal = Math.max(0, newVal);
        x.value = newVal;
        progress.value = newVal/max.value;
      }
    }
  );

  const stylez = useAnimatedStyle(
    () => {
      return {
        transform: [
          {translateX: x.value},
        ],
      }
    }
  );
  return (
    <View style={{height: 100, padding: 20}}>
      <View onLayout={({width}) => {max.value = width;}}>
        <PanGestureHandler onGestureEvent={handler} >
          <Animated.View style={[styles.dot, stylez]} />
        </PanGestureHandler>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
    dot: {
      borderRadius: 100,
      backagroundColor: 'black',
      width: 40,
      height: 40,
    },
});