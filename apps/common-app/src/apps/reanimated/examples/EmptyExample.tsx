import type { ParamListBase } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as React from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { withSharedTransitionBoundary } from './SharedElementTransitions/withSharedTransitionBoundary';

// Repro for #10899: the border width should change smoothly with the move.
const Stack = createNativeStackNavigator();

const transition = undefined;

function Screen1Content({ navigation }: NativeStackScreenProps<ParamListBase>) {
  return (
    <View style={styles.flexOne}>
      <Text style={styles.label}>Source: borderWidth 12, black</Text>
      <Button
        onPress={() => navigation.navigate('Screen2')}
        title="go to screen2"
      />
      <Animated.View
        style={styles.boxScreenOne}
        sharedTransitionTag="border-box"
        sharedTransitionStyle={transition}
      />
    </View>
  );
}

function Screen2Content({ navigation }: NativeStackScreenProps<ParamListBase>) {
  return (
    <View style={styles.flexOne}>
      <Text style={styles.label}>Target: borderWidth 0</Text>
      <Button title="go back" onPress={() => navigation.popTo('Screen1')} />
      <Animated.View
        style={styles.boxScreenTwo}
        sharedTransitionTag="border-box"
        sharedTransitionStyle={transition}
      />
    </View>
  );
}

const Screen1 = withSharedTransitionBoundary(Screen1Content);
const Screen2 = withSharedTransitionBoundary(Screen2Content);

export default function EmptyExample() {
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
  flexOne: { flex: 1, justifyContent: 'flex-end', alignItems: 'center' },
  label: { fontSize: 18, marginBottom: 8 },
  boxScreenOne: {
    width: 300,
    height: 150,
    marginBottom: 40,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    borderWidth: 12,
    borderColor: 'black',
    backgroundColor: 'pink',
  },
  boxScreenTwo: {
    width: 350,
    height: 500,
    marginBottom: 100,
    borderRadius: 50,
    borderWidth: 0,
    backgroundColor: 'pink',
  },
});
