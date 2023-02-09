import * as React from 'react';
import { Button, View, Image, Text } from 'react-native';
import { ParamListBase } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Animated from 'react-native-reanimated';
import { StackScreenProps } from '@react-navigation/stack';

const photo = require('./assets/image.jpg');
const Stack = createNativeStackNavigator();
const AnimatedButton = Animated.createAnimatedComponent(Button);
const AnimatedImage = Animated.createAnimatedComponent(Image);

function Screen1({ navigation }: StackScreenProps<ParamListBase>) {
  return (
    <Animated.ScrollView style={{ flex: 1 }}>
      <View style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap' }}>
        <AnimatedImage
          sharedTransitionTag="mleko"
          source={photo}
          style={{ width: 150, height: 150, marginLeft: 50, marginTop: 50 }}
        />
      </View>
      <Button
        onPress={() => navigation.navigate('Screen2')}
        title="Go to the next screen"
      />
    </Animated.ScrollView>
  );
}

function Screen2({ navigation }: StackScreenProps<ParamListBase>) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ marginTop: 50, textAlign: 'justify' }}>
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Mauris id
        egestas nunc. Fusce molestie, libero a lacinia mollis, nisi nisi
        porttitor tortor, eget vestibulum lectus mauris id mi. Aenean imperdiet
        tempor est eu auctor. Praesent vitae mi at risus dapibus vulputate ac
        quis ipsum. Nunc tincidunt risus quam, et sagittis neque hendrerit et.
        Maecenas at fermentum eros, sed accumsan enim. Nam diam est, dapibus
        malesuada volutpat non, vehicula at mauris.
      </Text>
      <AnimatedImage
        sharedTransitionTag="mleko"
        source={photo}
        style={{ width: '100%', height: 500 }}
      />
      <AnimatedButton
        title="go back"
        onPress={() => navigation.navigate('Screen1')}
      />
    </View>
  );
}

export function ImageExample() {
  return (
    // <NavigationContainer>
    <Stack.Navigator
      screenOptions={{
        stackAnimation: 'fade',
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
    // </NavigationContainer>
  );
}
