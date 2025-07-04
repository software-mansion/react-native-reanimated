import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  AnimatableValue,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { DefaultStyle } from 'react-native-reanimated/lib/typescript/hook/commonTypes';

export default function EmptyExample() {
  const boxShadowActiveSV = useSharedValue({
    blurRadius: 7,
    color: 'blue',
    offsetX: 20,
    offsetY: 20,
    spreadDistance: 10,
  });

  const styleActive = useAnimatedStyle(() => {
    return {
      boxShadow: [
        withSpring(boxShadowActiveSV.value as unknown as AnimatableValue, {
          duration: 700,
        }),
      ],
    } as DefaultStyle;
  });

  // useEffect(() => {
  //   setTimeout(() => {
  //     console.log('set value');
  //     boxShadowActiveSV.value = {
  //       blurRadius: 10,
  //       color: 'red',
  //       offsetX: 30,
  //       offsetY: 30,
  //       spreadDistance: 20,
  //     };
  //   }, 1000);
  // }, []);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.box1, styleActive]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  box1: {
    width: 100,
    height: 100,
    backgroundColor: 'palevioletred',
    boxShadow: '20px 20px 5px 0px red',
  },
});
