import * as React from 'react';
import { View, Button, StyleSheet } from 'react-native';
import type { ParamListBase } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Animated, {
  SharedTransition,
  SharedTransitionType,
} from 'react-native-reanimated';

const Stack = createNativeStackNavigator();

const photo = require('./assets/image.jpg');

const transition = SharedTransition.duration(1000).defaultTransitionType(
  SharedTransitionType.ANIMATION
);

function Screen1({ navigation }: NativeStackScreenProps<ParamListBase>) {
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

function Screen2({ navigation }: NativeStackScreenProps<ParamListBase>) {
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
