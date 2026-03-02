import type { ParamListBase } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as React from 'react';
import { Button, StyleSheet, View } from 'react-native';
import Animated, { SharedTransition } from 'react-native-reanimated';
import photo from './assets/image.jpg';
import { withSharedTransitionBoundary } from './withSharedTransitionBoundary';

const Stack = createNativeStackNavigator();

const transition = undefined;

// SharedTransition.duration(1000).defaultTransitionType(
//   SharedTransitionType.ANIMATION
// );

function Screen1Content({ navigation }: NativeStackScreenProps<ParamListBase>) {
  return (
    <View style={styles.flexOne}>
      <Button
        onPress={() => navigation.navigate('Screen2')}
        title="go to screen2"
      />

      <Animated.View
        style={styles.greenBoxScreenOne}
        sharedTransitionTag="tag"
        sharedTransitionStyle={transition}>
        <Animated.Image
          style={styles.imageOne}
          sharedTransitionTag="image"
          sharedTransitionStyle={transition}
          source={photo}
        />
      </Animated.View>
    </View>
  );
}

function Screen2Content({ navigation }: NativeStackScreenProps<ParamListBase>) {
  return (
    <View style={styles.flexOne}>
      <Button title="go back" onPress={() => navigation.popTo('Screen1')} />
      <Animated.View
        style={styles.greenBoxScreenTwo}
        sharedTransitionTag="tag"
        sharedTransitionStyle={transition}>
        <Animated.Image
          style={styles.imageTwo}
          sharedTransitionTag="image"
          sharedTransitionStyle={transition}
          source={photo}
        />
      </Animated.View>
    </View>
  );
}

const Screen1 = withSharedTransitionBoundary(Screen1Content);
const Screen2 = withSharedTransitionBoundary(Screen2Content);

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
  flexOne: { flex: 1, justifyContent: 'flex-end', alignItems: 'center' },
  greenBoxScreenOne: {
    width: 300,
    height: 150,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    backgroundColor: 'pink',
  },
  greenBoxScreenTwo: {
    width: 350,
    height: 500,
    marginBottom: 100,
    borderRadius: 50,
    backgroundColor: 'pink',
  },
  imageOne: {
    margin: 10,
    width: 280,
    height: 140,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
  },
  imageTwo: {
    margin: 10,
    width: 330,
    height: 200,
    borderRadius: 40,
  },
});
