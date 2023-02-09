import * as React from 'react';
import { Button, View } from 'react-native';
import { ParamListBase } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Animated from 'react-native-reanimated';
import { StackScreenProps } from '@react-navigation/stack';

const Stack = createNativeStackNavigator();

function Screen1({ navigation }: StackScreenProps<ParamListBase>) {
  return (
    <Animated.ScrollView style={{ flex: 1 }}>
      <Animated.View
        style={{
          width: 150,
          height: 150,
          marginLeft: 20,
          marginTop: 50,
          backgroundColor: 'green',
          opacity: 1,
        }}
        sharedTransitionTag="mleko"
      />
      <Button
        onPress={() => navigation.navigate('Screen2')}
        title="go to screen2"
      />
    </Animated.ScrollView>
  );
}

function Screen2({ navigation }: StackScreenProps<ParamListBase>) {
  return (
    <View style={{ flex: 1 }}>
      <Animated.View
        style={{
          width: 150,
          height: 150,
          marginLeft: 20,
          marginTop: 50,
          backgroundColor: 'green',
          opacity: 0.5,
        }}
        sharedTransitionTag="mleko"
      />
      <Button title="go back" onPress={() => navigation.navigate('Screen1')} />
    </View>
  );
}

export function MixedPropsExample() {
  return (
    // <NavigationContainer>
    <Stack.Navigator
      screenOptions={{
        stackAnimation: 'none',
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
