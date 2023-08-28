import * as React from 'react';

import Animated, {
  ReduceMotion,
  SharedTransition,
  withSpring,
} from 'react-native-reanimated';
import { Button, StyleSheet, View } from 'react-native';
import {
  NativeStackScreenProps,
  createNativeStackNavigator,
} from '@react-navigation/native-stack';

import { ParamListBase } from '@react-navigation/native';

const Stack = createNativeStackNavigator();

const EXAMPLES = [
  {
    text: 'default',
    transition: SharedTransition.duration(1000),
  },
  {
    text: ReduceMotion.Always,
    transition: SharedTransition.duration(1000).reduceMotion(
      ReduceMotion.Always
    ),
  },
  {
    text: ReduceMotion.Never,
    transition: SharedTransition.duration(1000).reduceMotion(
      ReduceMotion.Never
    ),
  },
  {
    text: 'custom default',
    transition: SharedTransition.duration(1000).custom((values) => {
      'worklet';
      return {
        width: withSpring(values.targetWidth),
        originX: withSpring(values.targetOriginX),
        originY: withSpring(values.targetOriginY),
      };
    }),
  },
  {
    text: 'custom always',
    transition: SharedTransition.duration(1000)
      .reduceMotion(ReduceMotion.Always)
      .custom((values) => {
        'worklet';
        return {
          width: withSpring(values.targetWidth),
          originX: withSpring(values.targetOriginX),
          originY: withSpring(values.targetOriginY),
        };
      }),
  },
  {
    text: 'custom never',
    transition: SharedTransition.duration(1000)
      .reduceMotion(ReduceMotion.Never)
      .custom((values) => {
        'worklet';
        return {
          width: withSpring(values.targetWidth, {
            reduceMotion: ReduceMotion.Never,
          }),
          originX: withSpring(values.targetOriginX, {
            reduceMotion: ReduceMotion.Never,
          }),
          originY: withSpring(values.targetOriginY, {
            reduceMotion: ReduceMotion.Never,
          }),
        };
      }),
  },
];

function Screen1({ navigation }: NativeStackScreenProps<ParamListBase>) {
  return (
    <Animated.ScrollView style={styles.flexOne}>
      {EXAMPLES.map(({ text, transition }, i) => (
        <Animated.View
          key={i}
          style={styles.boxScreenOne}
          sharedTransitionTag={'tag1' + text}
          sharedTransitionStyle={transition}>
          <Animated.Text
            style={styles.text}
            sharedTransitionTag={'tag2' + text}
            sharedTransitionStyle={transition}>
            {text}
          </Animated.Text>
        </Animated.View>
      ))}
      <Button
        onPress={() => navigation.navigate('Screen2')}
        title="go to screen2"
      />
    </Animated.ScrollView>
  );
}

function Screen2({ navigation }: NativeStackScreenProps<ParamListBase>) {
  return (
    <View style={styles.flexOne}>
      {EXAMPLES.map(({ text, transition }, i) => (
        <Animated.View
          key={i}
          style={styles.boxScreenTwo}
          sharedTransitionTag={'tag1' + text}
          sharedTransitionStyle={transition}>
          <Animated.Text
            style={styles.text}
            sharedTransitionTag={'tag2' + text}
            sharedTransitionStyle={transition}>
            {text}
          </Animated.Text>
        </Animated.View>
      ))}
      <Button title="go back" onPress={() => navigation.navigate('Screen1')} />
    </View>
  );
}

export default function ReducedMotionSharedExample() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Screen1"
        component={Screen1}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Screen2"
        component={Screen2}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  flexOne: { flex: 1 },
  boxScreenOne: {
    height: 60,
    width: 150,
    margin: 20,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: '#b58df1',
  },
  boxScreenTwo: {
    height: 60,
    width: 300,
    margin: 20,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: '#b58df1',
  },
  text: {
    margin: 20,
    color: '#b58df1',
    fontWeight: 'bold',
    alignSelf: 'center',
  },
});
