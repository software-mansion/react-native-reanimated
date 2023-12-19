import * as React from 'react';
import { Button, View, StyleSheet } from 'react-native';
import { ParamListBase } from '@react-navigation/native';
import {
  createNativeStackNavigator,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import Animated, { SlideInLeft, SlideOutLeft } from 'react-native-reanimated';

const photo = require('./assets/image.jpg');
const Stack = createNativeStackNavigator();
const AnimatedButton = Animated.createAnimatedComponent(Button);

function Screen1({ navigation }: NativeStackScreenProps<ParamListBase>) {
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

function Screen2({ navigation }: NativeStackScreenProps<ParamListBase>) {
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
      <AnimatedButton
        title="go back"
        entering={SlideInLeft.delay(1000)}
        exiting={SlideOutLeft}
        onPress={() => navigation.navigate('Screen1')}
      />
    </View>
  );
}

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
