import * as React from 'react';
import { View, Button, StyleSheet } from 'react-native';
import { ParamListBase } from '@react-navigation/native';
import {
  createNativeStackNavigator,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import Animated from 'react-native-reanimated';

const Stack = createNativeStackNavigator();

function Screen1({ navigation }: NativeStackScreenProps<ParamListBase>) {
  return (
    <View style={styles.flexOne}>
      <Animated.View style={styles.redBox} sharedTransitionTag="tag1" />
      <Button title="Screen2" onPress={() => navigation.navigate('Screen2')} />
      <Button title="Screen3" onPress={() => navigation.navigate('Screen3')} />
    </View>
  );
}

function Screen2({ navigation }: NativeStackScreenProps<ParamListBase>) {
  return (
    <View style={styles.container}>
      <Animated.View style={styles.greenBox} sharedTransitionTag="tag1" />
      <Button title="Screen1" onPress={() => navigation.navigate('Screen1')} />
      <Button title="Screen3" onPress={() => navigation.navigate('Screen3')} />
    </View>
  );
}

function Screen3({ navigation }: NativeStackScreenProps<ParamListBase>) {
  return (
    <View style={styles.flexOne}>
      <Animated.View style={styles.blueBox} sharedTransitionTag="tag1" />
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

export default function NestedStacksExample() {
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
