import type { ParamListBase } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as React from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';
import Animated, {
  SharedTransition,
  SharedTransitionType,
  withSpring,
} from 'react-native-reanimated';

import { withSharedTransitionBoundary } from './withSharedTransitionBoundary';

const Stack = createNativeStackNavigator();

const TRANSITION = SharedTransition.custom((values) => {
  'worklet';
  return {
    width: withSpring(values.targetWidth),
    height: withSpring(values.targetHeight),
    originX: withSpring(values.targetOriginX),
    originY: withSpring(values.targetOriginY),
  };
})
  .progressAnimation((values, progress) => {
    'worklet';
    const interpolate = (
      progress: number,
      current: number,
      target: number,
    ): number => {
      return progress * (target - current) + current;
    };
    return {
      width: interpolate(progress, values.currentWidth, values.targetWidth),
      height: interpolate(progress, values.currentHeight, values.targetHeight),
      originX: interpolate(
        progress,
        values.currentOriginX,
        values.targetOriginX,
      ),
      originY: interpolate(
        progress,
        values.currentOriginY,
        values.targetOriginY,
      ),
    };
  })
  .defaultTransitionType(SharedTransitionType.ANIMATION);

function Screen1Content({ navigation }: NativeStackScreenProps<ParamListBase>) {
  return (
    <Animated.ScrollView style={styles.flexOne}>
      <View style={styles.instructions}>
        <Text style={styles.heading}>width, height, originX, originY</Text>
        <Text style={styles.body}>
          Tap the button below. The green box should spring-animate from its
          small position here (150×150, top-left) to a larger position on Screen
          2 (200×300, lower and further right) — width, height and origin all
          interpolated with withSpring.
        </Text>
        <Text style={styles.body}>
          On iOS, start a swipe-back gesture from Screen 2: the box should track
          your finger linearly (progressAnimation), not spring.
        </Text>
      </View>
      <Animated.View
        style={styles.greenBoxScreenOne}
        sharedTransitionTag='tag'
        sharedTransitionStyle={TRANSITION}
      />
      <Button
        onPress={() => navigation.navigate('Screen2')}
        title='go to screen2'
      />
    </Animated.ScrollView>
  );
}

function Screen2Content({ navigation }: NativeStackScreenProps<ParamListBase>) {
  return (
    <View style={styles.flexOne}>
      <View style={styles.instructions}>
        <Text style={styles.body}>
          The same green box should now sit at 200×300, lower and further right
          than on Screen 1. Tap the back button to spring back, or (iOS only)
          swipe from the left edge to scrub the transition with your finger.
        </Text>
      </View>
      <Animated.View
        style={styles.greenBoxScreenTwo}
        sharedTransitionTag='tag'
        sharedTransitionStyle={TRANSITION}
      />
      <Button title='go back' onPress={() => navigation.popTo('Screen1')} />
    </View>
  );
}

const Screen1 = withSharedTransitionBoundary(Screen1Content);
const Screen2 = withSharedTransitionBoundary(Screen2Content);

export default function CustomTransitionExample() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name='Screen1'
        component={Screen1}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name='Screen2'
        component={Screen2}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  flexOne: { flex: 1 },
  instructions: {
    padding: 16,
    backgroundColor: '#f4f4f4',
  },
  heading: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  body: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 6,
  },
  greenBoxScreenOne: {
    width: 150,
    height: 150,
    marginLeft: 20,
    marginTop: 50,
    backgroundColor: 'green',
  },
  greenBoxScreenTwo: {
    width: 200,
    height: 300,
    marginLeft: 60,
    marginTop: 100,
    backgroundColor: 'green',
  },
});
