import { ParamListBase } from '@react-navigation/native';
import React from 'react';
import { View, StyleSheet, Button } from 'react-native';
import {
  createNativeStackNavigator,
  NativeStackScreenProps,
} from 'react-native-screens/native-stack';
import { ScreenTransition } from 'react-native-reanimated';

const ScreenA = ({ navigation }: NativeStackScreenProps<ParamListBase>) => (
  <View style={[styles.container, styles.screenA]}>
    <Button
      title="Go to details"
      onPress={() => navigation.navigate('ScreenB')}
    />
    <Button onPress={() => navigation.pop()} title="🔙 Back to ScreenA" />
  </View>
);

const ScreenB = ({ navigation }: NativeStackScreenProps<ParamListBase>) => (
  <View style={[styles.container, styles.screenB]}>
    <Button title="Go back" onPress={() => navigation.goBack()} />
  </View>
);

const Stack = createNativeStackNavigator();

const App = () => (
  <Stack.Navigator
    screenOptions={{
      stackAnimation: 'none',
      goBackGesture: 'swipeRight',
      transitionAnimation: ScreenTransition.horizontal,
    }}>
    <Stack.Screen
      name="ScreenA"
      component={ScreenA}
      options={{ title: 'Screen Transition Animation' }}
    />
    <Stack.Screen name="ScreenB" component={ScreenB} />
  </Stack.Navigator>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 10,
  },
  screenA: {
    backgroundColor: 'moccasin',
  },
  screenB: {
    backgroundColor: 'thistle',
  },
});

export default App;
