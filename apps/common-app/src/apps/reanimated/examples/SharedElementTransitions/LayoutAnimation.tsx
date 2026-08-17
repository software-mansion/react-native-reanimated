import type { ParamListBase } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as React from 'react';
import { Button, StyleSheet, View } from 'react-native';
import Animated, { SlideInLeft, SlideOutLeft } from 'react-native-reanimated';

import photo from './assets/image.jpg';
import { withSharedTransitionBoundary } from './withSharedTransitionBoundary';

const Stack = createNativeStackNavigator();

function Screen1Content({ navigation }: NativeStackScreenProps<ParamListBase>) {
  return (
    <Animated.ScrollView style={styles.flexOne}>
      <View style={styles.container}>
        <Animated.Image
          sharedTransitionTag="sharedImage"
          source={photo}
          style={styles.imageScreenOne}
        />
        <Button
          onPress={() => navigation.navigate('Screen2')}
          title="Go to the next screen"
        />
      </View>
    </Animated.ScrollView>
  );
}

function Screen2Content({ navigation }: NativeStackScreenProps<ParamListBase>) {
  return (
    <View style={styles.flexOne}>
      <Animated.Text
        style={styles.text}
        entering={SlideInLeft.delay(1000)}
        exiting={SlideOutLeft}>
        Awesome header!
      </Animated.Text>
      <Animated.Image
        sharedTransitionTag="sharedImage"
        source={photo}
        style={styles.imageScreenTwo}
      />
      <Animated.Text
        style={styles.justify}
        entering={SlideInLeft.delay(1000)}
        exiting={SlideOutLeft}>
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Mauris id
        egestas nunc. Fusce molestie, libero a lacinia mollis, nisi nisi
        porttitor tortor, eget vestibulum lectus mauris id mi. Aenean imperdiet
        tempor est eu auctor. Praesent vitae mi at risus dapibus vulputate ac
        quis ipsum. Nunc tincidunt risus quam, et sagittis neque hendrerit et.
      </Animated.Text>
      <Animated.View entering={SlideInLeft.delay(1000)} exiting={SlideOutLeft}>
        <Button title="go back" onPress={() => navigation.popTo('Screen1')} />
      </Animated.View>
    </View>
  );
}

const Screen1 = withSharedTransitionBoundary(Screen1Content);
const Screen2 = withSharedTransitionBoundary(Screen2Content);

export default function LayoutAnimationExample() {
  return (
    <Stack.Navigator
      screenOptions={{
        animation: 'fade',
      }}>
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
  container: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  },
  justify: {
    textAlign: 'justify',
  },
  imageScreenOne: {
    width: 150,
    height: 150,
    marginTop: 50,
  },
  imageScreenTwo: {
    width: '100%',
    height: 500,
  },
  text: {
    marginTop: 10,
    fontWeight: 'bold',
    fontSize: 30,
  },
});
