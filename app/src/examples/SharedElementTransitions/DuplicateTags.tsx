import { ParamListBase } from '@react-navigation/native';
import {
  NativeStackScreenProps,
  createNativeStackNavigator,
} from '@react-navigation/native-stack';
import * as React from 'react';
import { StyleSheet, TouchableNativeFeedback, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

const firstPhoto = require('./assets/doge.jpg');
const secondPhoto = require('./assets/angry-doge.jpg');
const Stack = createNativeStackNavigator();

interface DogeProps {
  orientation?: number;
  firstSharedTag?: string;
  secondSharedTag?: string;
}

function Doge({ orientation, firstSharedTag, secondSharedTag }: DogeProps) {
  const animatedStyle = useAnimatedStyle(() => {
    return {
      width: 200,
      height: 200,
      transform: [{ rotate: `${orientation}deg` }],
    };
  });
  return (
    <Animated.View style={styles.dogeContainer}>
      <Animated.Image
        source={firstPhoto}
        style={animatedStyle}
        sharedTransitionTag={firstSharedTag}
      />
      <Animated.Image
        source={secondPhoto}
        style={animatedStyle}
        sharedTransitionTag={secondSharedTag}
      />
    </Animated.View>
  );
}

type DogeScreenProps = NativeStackScreenProps<ParamListBase> & DogeProps;

function DogeScreen({
  navigation,
  orientation,
  firstSharedTag,
  secondSharedTag,
}: DogeScreenProps) {
  return (
    <View style={styles.container}>
      <View style={styles.halfScreen}>
        <TouchableNativeFeedback
          onPressOut={() => {
            navigation.navigate('Screen1');
          }}>
          <Animated.View style={[styles.quarterScreen, styles.topLeft]} />
        </TouchableNativeFeedback>
        <TouchableNativeFeedback
          onPressOut={() => {
            navigation.navigate('Screen2');
          }}>
          <Animated.View style={[styles.quarterScreen, styles.topRight]} />
        </TouchableNativeFeedback>
      </View>

      <View style={styles.halfScreen}>
        <TouchableNativeFeedback
          onPressOut={() => {
            navigation.navigate('Screen3');
          }}>
          <Animated.View style={[styles.quarterScreen, styles.bottomLeft]} />
        </TouchableNativeFeedback>
        <TouchableNativeFeedback
          onPressOut={() => {
            navigation.navigate('Screen4');
          }}>
          <Animated.View style={[styles.quarterScreen, styles.bottomRight]} />
        </TouchableNativeFeedback>
      </View>
      <Doge
        orientation={orientation}
        firstSharedTag={firstSharedTag}
        secondSharedTag={secondSharedTag}
      />
    </View>
  );
}

function Screen1({ route, navigation }: NativeStackScreenProps<ParamListBase>) {
  return (
    <DogeScreen
      route={route}
      navigation={navigation}
      orientation={0}
      firstSharedTag="1"
      secondSharedTag="2"
    />
  );
}

function Screen2({ route, navigation }: NativeStackScreenProps<ParamListBase>) {
  return (
    <DogeScreen
      route={route}
      navigation={navigation}
      orientation={90}
      firstSharedTag="2"
      secondSharedTag="1"
    />
  );
}

function Screen3({ route, navigation }: NativeStackScreenProps<ParamListBase>) {
  return (
    <DogeScreen
      route={route}
      navigation={navigation}
      orientation={180}
      firstSharedTag="2"
      secondSharedTag="2"
    />
  );
}

function Screen4({ route, navigation }: NativeStackScreenProps<ParamListBase>) {
  return (
    <DogeScreen
      route={route}
      navigation={navigation}
      orientation={270}
      firstSharedTag="1"
      secondSharedTag="1"
    />
  );
}

export default function DuplicateTagsExample() {
  return (
    <Stack.Navigator
      screenOptions={
        {
          // animation: 'none',
        }
      }>
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
      <Stack.Screen
        name="Screen3"
        component={Screen3}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Screen4"
        component={Screen4}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  halfScreen: {
    flex: 0.5,
    flexDirection: 'row',
  },
  quarterScreen: {
    flex: 0.5,
  },
  topLeft: {
    backgroundColor: 'navy',
  },
  topRight: {
    backgroundColor: 'purple',
  },
  bottomLeft: {
    backgroundColor: 'orange',
  },
  bottomRight: {
    backgroundColor: 'yellow',
  },
  dogeContainer: {
    position: 'absolute',
  },
});
