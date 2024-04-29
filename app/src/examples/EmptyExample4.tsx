import Animated from 'react-native-reanimated';
import { Button, StyleSheet } from 'react-native';

import React from 'react';
import {
  NativeStackScreenProps,
  createNativeStackNavigator,
} from '@react-navigation/native-stack';

type ParamList = {
  First?: {};
  Second?: {};
};

const Stack = createNativeStackNavigator<ParamList>();

function First({ navigation }: NativeStackScreenProps<ParamList, 'First'>) {
  const [toggle, setToggle] = React.useState(false);
  return (
    <>
      <Button title="Navigate" onPress={() => navigation.navigate('Second')} />
      <Button title="Toggle" onPress={() => setToggle(!toggle)} />
      {toggle && <Animated.View
        style={[styles.blue]}
        sharedTransitionTag='test'
      />}
    </>
  );
}

function Second({ navigation }: NativeStackScreenProps<ParamList, 'Second'>) {
  const [toggle, setToggle] = React.useState(false);
  return (
    <>
      <Button title="Navigate" onPress={() => navigation.navigate('First')} />
      <Button title="Toggle" onPress={() => setToggle(!toggle)} />
      {toggle && <Animated.View
        style={[styles.green]}
        sharedTransitionTag='test'
      />}
    </>
  );
}

export default function NestedNativeStacksWithLayout() {
  const [toggle, setToggle] = React.useState(true);
  return (
    <>
      <Button title="Toggle" onPress={() => setToggle(!toggle)} />
      {toggle && <Animated.View
        style={[styles.box, styles.green]}
        sharedTransitionTag='test'
      />}
      <Stack.Navigator initialRouteName="First">
        <Stack.Screen name="First" component={First} />
        <Stack.Screen name="Second" component={Second} />
      </Stack.Navigator>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    marginTop: 300,
    backgroundColor: 'red',
  },
  box: {
    width: 100,
    height: 100,
  },
  blue: { 
    backgroundColor: 'blue',
    width: 200,
    height: 200,
  },
  green: { backgroundColor: 'green' },
});
