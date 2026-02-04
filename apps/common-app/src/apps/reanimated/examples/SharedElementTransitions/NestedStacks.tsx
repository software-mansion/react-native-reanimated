import type { ParamListBase } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import * as React from 'react';
import { Button, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function Screen0({ navigation }: NativeStackScreenProps<ParamListBase>) {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false, animation: 'none' }}>
      <Tab.Screen name="A" initialParams={{ id: 0 }} component={Screen1} />
    </Tab.Navigator>
  );
}

function Screen1({ navigation }: NativeStackScreenProps<ParamListBase>) {
  return (
    <View style={styles.flexOne}>
      <Animated.View style={styles.redBox} sharedTransitionTag="tag1" />
      <Button
        title="go to NestedStack"
        onPress={() => navigation.navigate('NestedStack')}
      />
      <Button title="go back" onPress={() => navigation.goBack()} />
    </View>
  );
}

function Screen2({ navigation }: NativeStackScreenProps<ParamListBase>) {
  return (
    <View style={styles.container}>
      <Animated.View style={styles.greenBox} sharedTransitionTag="tag1" />
      <Button title="Screen3" onPress={() => navigation.navigate('Screen3')} />
      <Button title="go back" onPress={() => navigation.goBack()} />
    </View>
  );
}

function Screen3({ navigation }: NativeStackScreenProps<ParamListBase>) {
  return (
    <View style={styles.flexOne}>
      <Animated.View style={styles.blueBox} sharedTransitionTag="tag1" />
      <Button title="Screen2" onPress={() => navigation.popTo('Screen2')} />
      <Button title="go back" onPress={() => navigation.goBack()} />
    </View>
  );
}

function NestedStack() {
  return (
    <Stack.Navigator>
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

export default function NestedStacksExample() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Screen0"
        component={Screen0}
        options={{ headerShown: true }}
      />
      <Stack.Screen
        name="NestedStack"
        component={NestedStack}
        options={{ headerShown: true }}
      />
    </Stack.Navigator>
  );
}
const styles = StyleSheet.create({
  flexOne: { flex: 1 },
  container: {
    flex: 1,
    marginTop: 50,
  },
  redBox: {
    width: 150,
    height: 150,
    backgroundColor: 'red',
    borderWidth: 5,
  },
  greenBox: {
    width: 100,
    height: 100,
    backgroundColor: 'green',
    borderWidth: 5,
  },
  blueBox: {
    width: 100,
    height: 100,
    backgroundColor: 'blue',
  },
});
