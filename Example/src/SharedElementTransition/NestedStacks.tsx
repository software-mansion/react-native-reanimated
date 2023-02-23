import * as React from 'react';
import { View, Button } from 'react-native';
import { ParamListBase } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Animated from 'react-native-reanimated';
import { StackScreenProps } from '@react-navigation/stack';

const Stack = createNativeStackNavigator();

function Screen1({ navigation }: StackScreenProps<ParamListBase>) {
  return (
    <View style={{ flex: 1 }}>
      <Animated.View
        style={{
          width: 150,
          height: 150,
          backgroundColor: 'red',
          borderWidth: 5,
        }}
        sharedTransitionTag="tag1"
      />
      <Button title="Screen2" onPress={() => navigation.navigate('Screen2')} />
      <Button title="Screen3" onPress={() => navigation.navigate('Screen3')} />
    </View>
  );
}

function Screen2({ navigation }: StackScreenProps<ParamListBase>) {
  return (
    <View style={{ flex: 1, marginTop: 50 }}>
      <Animated.View
        style={{
          width: 100,
          height: 100,
          backgroundColor: 'green',
          borderWidth: 5,
        }}
        sharedTransitionTag="tag1"
      />
      <Button title="Screen1" onPress={() => navigation.navigate('Screen1')} />
      <Button title="Screen3" onPress={() => navigation.navigate('Screen3')} />
    </View>
  );
}

function Screen3({ navigation }: StackScreenProps<ParamListBase>) {
  return (
    <View style={{ flex: 1 }}>
      <Animated.View
        style={{ width: 100, height: 100, backgroundColor: 'blue' }}
        sharedTransitionTag="tag1"
      />
      <Button title="Screen1" onPress={() => navigation.navigate('Screen1')} />
      <Button title="Screen2" onPress={() => navigation.navigate('Screen2')} />
    </View>
  );
}

function NestedStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Screen1"
        component={Screen1}
        options={{ headerShown: true }}
      />
      <Stack.Screen
        name="Screen2"
        component={Screen2}
        options={{ headerShown: true }}
      />
      <Stack.Screen
        name="Screen3"
        component={Screen3}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

export function NestedStacksExample() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="NestedStack"
        component={NestedStack}
        options={{ headerShown: true }}
      />
    </Stack.Navigator>
  );
}
