import type { ParamListBase } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as React from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

import { withSharedTransitionBoundary } from './withSharedTransitionBoundary';

const Stack = createNativeStackNavigator();

function Screen1Content({ navigation }: NativeStackScreenProps<ParamListBase>) {
  const offset = useSharedValue(0);

  React.useEffect(() => {
    offset.value = 80;
  }, [offset]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value }],
  }));

  return (
    <View style={styles.flexOne}>
      <Animated.View
        sharedTransitionTag="staticBox"
        style={styles.staticBoxScreenOne}
      />
      <Animated.View
        sharedTransitionTag="animatedBox"
        style={[styles.animatedBoxScreenOne, animatedStyle]}
      />
      <Text style={styles.hint}>
        Both transitions should start from the transformed positions of the
        boxes, not from their layout positions on the left.
      </Text>
      <Button
        onPress={() => navigation.navigate('Screen2')}
        title="go to screen2"
      />
    </View>
  );
}

function Screen2Content({ navigation }: NativeStackScreenProps<ParamListBase>) {
  return (
    <View style={styles.flexOne}>
      <Animated.View
        sharedTransitionTag="staticBox"
        style={styles.staticBoxScreenTwo}
      />
      <Animated.View
        sharedTransitionTag="animatedBox"
        style={styles.animatedBoxScreenTwo}
      />
      <Button title="go back" onPress={() => navigation.popTo('Screen1')} />
    </View>
  );
}

const Screen1 = withSharedTransitionBoundary(Screen1Content);
const Screen2 = withSharedTransitionBoundary(Screen2Content);

export default function AnimatedTransformExample() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Screen1" component={Screen1} />
      <Stack.Screen name="Screen2" component={Screen2} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  flexOne: {
    flex: 1,
  },
  hint: {
    margin: 16,
  },
  staticBoxScreenOne: {
    width: 100,
    height: 100,
    marginTop: 50,
    backgroundColor: 'green',
    transform: [{ translateX: 60 }],
  },
  animatedBoxScreenOne: {
    width: 100,
    height: 100,
    marginTop: 20,
    backgroundColor: 'blue',
  },
  staticBoxScreenTwo: {
    width: 150,
    height: 150,
    marginTop: 350,
    marginLeft: 200,
    backgroundColor: 'green',
  },
  animatedBoxScreenTwo: {
    width: 150,
    height: 150,
    marginTop: 20,
    marginLeft: 50,
    backgroundColor: 'blue',
  },
});
