import {
  Text,
  StyleSheet,
  View,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { useAnimatedScrollHandler } from 'react-native-reanimated';

import React, { ComponentProps } from 'react';

export default function EmptyExample() {
  return (
    <View style={styles.container}>
      <Text>Hello world!</Text>
      <ScrollView
        contentContainerStyle={{ backgroundColor: 'yellow' }}
        onScroll={(event: any) => {
          console.log(event);
        }}>
        <Text>Scroll me</Text>
      </ScrollView>
      <ScrollView
        contentContainerStyle={{ backgroundColor: 'red' }}
        onScroll={useAnimatedScrollHandler((event) => {
          console.log(event);
        })}>
        <Text>Scroll me</Text>
      </ScrollView>
      <Animated.ScrollView
        contentContainerStyle={{ backgroundColor: 'blue' }}
        onScroll={useAnimatedScrollHandler((event: NativeScrollEvent) => {
          console.log(event);
        })}>
        <Text>Scroll me</Text>
      </Animated.ScrollView>
      <Animated.ScrollView
        contentContainerStyle={{ backgroundColor: 'green' }}
        onScroll={(event: NativeSyntheticEvent<NativeScrollEvent>) => {
          console.log(event);
        }}>
        <Text>Scroll me</Text>
      </Animated.ScrollView>
    </View>
  );
}

type A = ComponentProps<typeof Animated.ScrollView>['onScroll'];

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
