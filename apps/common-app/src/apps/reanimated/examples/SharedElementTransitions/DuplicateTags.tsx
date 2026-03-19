import type { ParamListBase } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as React from 'react';
import { StyleSheet, Text, TouchableNativeFeedback, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import firstPhoto from './assets/doge.jpg';
import secondPhoto from './assets/angry-doge.jpg';
import { withSharedTransitionBoundary } from './withSharedTransitionBoundary';

const Stack = createNativeStackNavigator();

interface DogeProps {
  orientation?: number;
  firstSharedTag?: string;
  secondSharedTag?: string;
}

function Doge({ orientation, firstSharedTag, secondSharedTag }: DogeProps) {
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${orientation}deg` }],
    };
  });
  return (
    <Animated.View style={[styles.dogeContainer, animatedStyle]}>
      <Animated.Image
        source={firstPhoto}
        style={styles.dogeStyle}
        sharedTransitionTag={firstSharedTag}
      />
      <Animated.Image
        source={secondPhoto}
        style={styles.dogeStyle}
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
          <View style={[styles.quarterScreen, styles.topLeft]}>
            <Text style={styles.numberStyle}>1</Text>
            <Text style={styles.subtextStyle}>no duplicates</Text>
          </View>
        </TouchableNativeFeedback>
        <TouchableNativeFeedback
          onPressOut={() => {
            navigation.navigate('Screen2');
          }}>
          <View style={[styles.quarterScreen, styles.topRight]}>
            <Text style={styles.numberStyle}>2</Text>
            <Text style={styles.subtextStyle}>no duplicates</Text>
          </View>
        </TouchableNativeFeedback>
      </View>

      <View style={styles.halfScreen}>
        <TouchableNativeFeedback
          onPressOut={() => {
            navigation.navigate('Screen3');
          }}>
          <View style={[styles.quarterScreen, styles.bottomLeft]}>
            <Text style={styles.numberStyle}>3</Text>
            <Text style={styles.subtextStyle}>duplicate tag: 2</Text>
          </View>
        </TouchableNativeFeedback>
        <TouchableNativeFeedback
          onPressOut={() => {
            navigation.navigate('Screen4');
          }}>
          <View style={[styles.quarterScreen, styles.bottomRight]}>
            <Text style={styles.numberStyle}>4</Text>
            <Text style={styles.subtextStyle}>duplicate tag: 1</Text>
          </View>
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

function Screen1Content({
  route,
  navigation,
}: NativeStackScreenProps<ParamListBase>) {
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

function Screen2Content({
  route,
  navigation,
}: NativeStackScreenProps<ParamListBase>) {
  return (
    <DogeScreen
      route={route}
      navigation={navigation}
      orientation={90}
      firstSharedTag="1"
      secondSharedTag="2"
    />
  );
}

function Screen3Content({
  route,
  navigation,
}: NativeStackScreenProps<ParamListBase>) {
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

function Screen4Content({
  route,
  navigation,
}: NativeStackScreenProps<ParamListBase>) {
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

const Screen1 = withSharedTransitionBoundary(Screen1Content);
const Screen2 = withSharedTransitionBoundary(Screen2Content);
const Screen3 = withSharedTransitionBoundary(Screen3Content);
const Screen4 = withSharedTransitionBoundary(Screen4Content);

export default function DuplicateTagsExample() {
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
    justifyContent: 'center',
    alignItems: 'center',
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
    backgroundColor: 'pink',
  },
  dogeContainer: {
    position: 'absolute',
  },
  dogeStyle: {
    width: 150,
    height: 150,
  },
  numberStyle: {
    color: 'white',
    fontSize: 48,
    fontWeight: 'bold',
    textShadowColor: 'black',
    textShadowRadius: 5,
  },
  subtextStyle: {
    color: 'white',
    fontSize: 12,
  },
});
