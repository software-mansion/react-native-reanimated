import * as React from 'react';
import { View, Button, StyleSheet } from 'react-native';
import { ParamListBase } from '@react-navigation/native';
import {
  createNativeStackNavigator,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import Animated from 'react-native-reanimated';

const Stack = createNativeStackNavigator();

function AScreen1({ navigation }: NativeStackScreenProps<ParamListBase>) {
  return (
    <View style={styles.flexOne}>
      <Animated.View style={styles.redBox} sharedTransitionTag="tag1" />
      <Button title="Screen2" onPress={() => navigation.navigate('A-Screen2')} />
      <Button title="Screen3" onPress={() => navigation.navigate('A-Screen3')} />

      <Button title="Stack->Screen1" onPress={() => navigation.navigate('NestedStack2')} />
    </View>
  );
}

function AScreen2({ navigation }: NativeStackScreenProps<ParamListBase>) {
  return (
    <View style={styles.container}>
      <Animated.View style={styles.greenBox} sharedTransitionTag="tag1" />
      <Button title="Screen1" onPress={() => navigation.navigate('A-Screen1')} />
      <Button title="Screen3" onPress={() => navigation.navigate('A-Screen3')} />
    </View>
  );
}

function AScreen3({ navigation }: NativeStackScreenProps<ParamListBase>) {
  return (
    <View style={styles.flexOne}>
      <Animated.View style={styles.blueBox} sharedTransitionTag="tag1" />
      <Button title="Screen1" onPress={() => navigation.navigate('A-Screen1')} />
      <Button title="Screen2" onPress={() => navigation.navigate('A-Screen2')} />
    </View>
  );
}

function NestedStack1() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="A-Screen1"
        component={AScreen1}
        options={{ headerShown: true }}
      />
      <Stack.Screen
        name="A-Screen2"
        component={AScreen2}
        options={{ headerShown: true }}
      />
      <Stack.Screen
        name="A-Screen3"
        component={AScreen3}
        options={{ headerShown: true }}
      />
    </Stack.Navigator>
  );
}

function BScreen1({ navigation }: NativeStackScreenProps<ParamListBase>) {
  return (
    <View style={styles.flexOne}>
      <Animated.View style={styles.greenBox} sharedTransitionTag="tag1" />
      <Button title="B-Screen2" onPress={() => navigation.navigate('B-Screen2')} />
      <Button title="B-Screen3" onPress={() => navigation.navigate('B-Screen3')} />

      <Button title="Stack->Screen1" onPress={() => navigation.navigate('NestedStack1')} />
    </View>
  );
}

function BScreen2({ navigation }: NativeStackScreenProps<ParamListBase>) {
  return (
    <View style={styles.flexOne}>
      <Animated.View style={styles.blueBox} sharedTransitionTag="tag1" />
      <Button title="B-Screen1" onPress={() => navigation.navigate('B-Screen1')} />
      <Button title="B-Screen3" onPress={() => navigation.navigate('B-Screen3')} />
    </View>
  );
}

function BScreen3({ navigation }: NativeStackScreenProps<ParamListBase>) {
  return (
    <View style={styles.container}>
      <Animated.View style={styles.redBox} sharedTransitionTag="tag1" />
      <Button title="B-Screen1" onPress={() => navigation.navigate('B-Screen1')} />
      <Button title="B-Screen2" onPress={() => navigation.navigate('B-Screen2')} />
    </View>
  );
}

function NestedStack2() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="B-Screen1"
        component={BScreen1}
        options={{ headerShown: true }}
      />
      <Stack.Screen
        name="B-Screen2"
        component={BScreen2}
        options={{ headerShown: true }}
      />
      <Stack.Screen
        name="B-Screen3"
        component={BScreen3}
        options={{ headerShown: true }}
      />
    </Stack.Navigator>
  );
}

export default function NestedStacksExample() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="NestedStack1"
        component={NestedStack1}
        options={{ headerShown: true }}
      />
      <Stack.Screen
        name="NestedStack2"
        component={NestedStack2}
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
