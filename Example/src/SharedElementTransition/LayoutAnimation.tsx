import * as React from 'react';
import { Button, View, Image } from 'react-native';
import { ParamListBase } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StackScreenProps } from '@react-navigation/stack';
import Animated, { SlideInLeft, SlideOutLeft } from 'react-native-reanimated';

const photo = require('./assets/image.jpg');
const Stack = createNativeStackNavigator();
const AnimatedButton = Animated.createAnimatedComponent(Button);
const AnimatedImage = Animated.createAnimatedComponent(Image);

function Screen1({ navigation }: StackScreenProps<ParamListBase>) {
  return (
    <Animated.ScrollView style={{ flex: 1 }}>
      <View
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
        <AnimatedImage
          sharedTransitionTag="sharedImage"
          source={photo}
          style={{ width: 150, height: 150, marginTop: 50 }}
        />
        <Button
          onPress={() => navigation.navigate('Screen2')}
          title="Go to the next screen"
        />
      </View>
    </Animated.ScrollView>
  );
}

function Screen2({ navigation }: StackScreenProps<ParamListBase>) {
  return (
    <View style={{ flex: 1 }}>
      <Animated.Text
        style={{ marginTop: 10, fontWeight: 'bold', fontSize: 30 }}
        entering={SlideInLeft.delay(1000)}
        exiting={SlideOutLeft}>
        Awesome header!
      </Animated.Text>
      <AnimatedImage
        sharedTransitionTag="sharedImage"
        source={photo}
        style={{ width: '100%', height: 500 }}
      />
      <Animated.Text
        style={{ textAlign: 'justify' }}
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

export function LayoutAnimationExample() {
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
