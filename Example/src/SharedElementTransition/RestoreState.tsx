/*
STATE: FAIL

desc: przejście z ekranu 3 na 1 nie przywraca stanu komponentu na ekranie pierwszym
*/

import * as React from 'react';
import {
  Button,
  View,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import {
  createNativeStackNavigator,
} from 'react-native-screens/native-stack';
import Animated from 'react-native-reanimated';

const Stack = createNativeStackNavigator();

function Screen1({ navigation }) {
  return (
    <Animated.ScrollView style={{ flex: 1 }}>
      <Animated.View
        style={{ width: '100%', height: 100, backgroundColor: 'green' }}
        sharedTransitionTag="mleko"
      />
      <Button onPress={() => navigation.navigate('Screen2')} title="go to screen2" />
    </Animated.ScrollView>
  );
}

function Screen2({ navigation }) {

  return (
    <View style={{ flex: 1 }}>
      <Animated.View
        style={{ width: '100%', height: 200, backgroundColor: 'green', marginTop: 200 }}
        sharedTransitionTag="mleko"
      />
      <Button
        title="go to screen3"
        onPress={() => navigation.navigate('Screen3')}
      />
      <Button
        title="go back"
        onPress={() => navigation.navigate('Screen1')}
      />
    </View>
  );
}

function Screen3({ navigation }) {

  return (
    <View style={{ flex: 1, marginTop: 50 }}>
      <Button
        title="go to screen1"
        onPress={() => navigation.navigate('Screen1')}
      />
      <Button
        title="go to screen2"
        onPress={() => navigation.navigate('Screen2')}
      />
    </View>
  );
}

export default function SimpleSharedElementTransition() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
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
        <Stack.Screen
          name="Screen3"
          component={Screen3}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
