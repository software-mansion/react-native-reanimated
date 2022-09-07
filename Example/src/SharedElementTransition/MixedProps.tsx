/*
STATE: FAIL

desc: da sie animować jedynie pozycję i rozmiar, opacity się nie animuje
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
        style={{width: 150, height: 150, marginLeft: 20, marginTop: 50, backgroundColor: 'green', opacity: 1 }}
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
        style={{ width: 150, height: 150, marginLeft: 20, marginTop: 50, backgroundColor: 'green', opacity: 0.5 }}
        sharedTransitionTag="mleko"
      />
      <Button
        title="go back"
        onPress={() => navigation.navigate('Screen1')}
      />
    </View>
  );
}

export default function SimpleSharedElementTransition() {
  return (
    <NavigationContainer>
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
    </NavigationContainer>
  );
}
