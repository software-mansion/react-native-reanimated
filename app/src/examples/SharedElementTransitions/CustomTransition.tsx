import * as React from 'react';
import { View, Button, StyleSheet } from 'react-native';
import { ParamListBase } from '@react-navigation/native';
import {
  createNativeStackNavigator,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import Animated, {
  SharedTransition,
  withSpring,
  SharedTransitionType,
} from 'react-native-reanimated';

const Stack = createNativeStackNavigator();

const transition = SharedTransition.duration(1000)
  .custom((values) => {
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
    const getValue = (
      progress: number,
      target: number,
      current: number
    ): number => {
      return progress * (target - current) + current;
    };
    return {
      width: getValue(progress, values.targetWidth, values.currentWidth),
      height: getValue(progress, values.targetHeight, values.currentHeight),
      originX: getValue(progress, values.targetOriginX, values.currentOriginX),
      originY: getValue(progress, values.targetOriginY, values.currentOriginY),
    };
  })
  .defaultTransitionType(SharedTransitionType.ANIMATION);

function Screen1({ navigation }: NativeStackScreenProps<ParamListBase>) {
  return (
    <Animated.ScrollView style={styles.flexOne}>
      <Animated.View
        style={styles.greenBoxScreenOne}
        sharedTransitionTag="tag"
        sharedTransitionStyle={transition}
      />
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
      <Animated.View
        style={styles.greenBoxScreenTwo}
        sharedTransitionTag="tag"
        sharedTransitionStyle={transition}
      />
      <Button title="go back" onPress={() => navigation.navigate('Screen1')} />
    </View>
  );
}

export default function CustomTransitionExample() {
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
