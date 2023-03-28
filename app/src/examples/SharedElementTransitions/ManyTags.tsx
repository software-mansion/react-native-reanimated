import * as React from 'react';
import { Button, View, Text } from 'react-native';
import { ParamListBase } from '@react-navigation/native';
import {
  createNativeStackNavigator,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import Animated from 'react-native-reanimated';

const photo = require('./assets/image.jpg');
const Stack = createNativeStackNavigator();
const AnimatedButton = Animated.createAnimatedComponent(Button);

function Screen1({ navigation }: NativeStackScreenProps<ParamListBase>) {
  return (
    <Animated.ScrollView style={{ flex: 1 }}>
      <View style={{ display: 'flex', flexDirection: 'column' }}>
        <View>
          <Animated.View
            sharedTransitionTag="placeholder1"
            style={{
              width: 30,
              height: 30,
              margin: 5,
              marginTop: 50,
              backgroundColor: 'green',
            }}
          />
          <Animated.Image
            sharedTransitionTag="mleko"
            source={photo}
            style={{ width: 150, height: 150, marginLeft: 50 }}
          />
          <Animated.View
            sharedTransitionTag="placeholder2"
            style={{
              width: 20,
              height: 30,
              margin: 10,
              backgroundColor: 'red',
            }}
          />
        </View>
      </View>
      <Button
        onPress={() => navigation.navigate('Screen2')}
        title="Go to the next screen"
      />
    </Animated.ScrollView>
  );
}

function Screen2({ navigation }: NativeStackScreenProps<ParamListBase>) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ marginTop: 10, textAlign: 'justify' }}>
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Mauris id
        egestas nunc. Fusce molestie, libero a lacinia mollis, nisi nisi
        porttitor tortor, eget vestibulum lectus mauris id mi. Aenean imperdiet
        tempor est eu auctor.
      </Text>
      <Animated.View
        sharedTransitionTag="placeholder2"
        style={{ width: 200, height: 50, margin: 20, backgroundColor: 'red' }}
      />
      <Text style={{ textAlign: 'justify' }}>
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Mauris id
        egestas nunc.
      </Text>
      <Animated.Image
        sharedTransitionTag="mleko"
        source={photo}
        style={{ width: '100%', height: 300 }}
      />
      <Text>Lorem ipsum dolor sit amet</Text>
      <Animated.View
        sharedTransitionTag="placeholder1"
        style={{ width: 100, height: 50, margin: 0, backgroundColor: 'green' }}
      />
      <AnimatedButton
        title="go back"
        onPress={() => navigation.navigate('Screen1')}
      />
    </View>
  );
}

export default function ManyTagsExample() {
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
