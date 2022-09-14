/*
STATE: OK
*/

import * as React from 'react';
import {
  Button,
  View,
  Image,
  Text,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import {
  createNativeStackNavigator,
} from 'react-native-screens/native-stack';
import Animated from 'react-native-reanimated';

const Stack = createNativeStackNavigator();
const AnimatedButton = Animated.createAnimatedComponent(Button);

function Screen1({ navigation }) {
  return (
    <Animated.ScrollView style={{ flex: 1 }}>
      <View style={{display: 'flex', flexDirection: 'column'}}>
        <View style={{ marginTop: 50, marginLeft: 10 }}>
          <View style={{ marginTop: 50, marginLeft: 10 }}>
            <View style={{ marginTop: 50, marginLeft: 10 }}>
              <Animated.View 
                sharedTransitionTag="mleko"
                style={{ width: 150, height: 150, backgroundColor: 'green' }}
              />
            </View>
          </View>
        </View>
      </View>
      <Button onPress={() => navigation.navigate('Screen2')} title="Go to the next screen" />
    </Animated.ScrollView>
  );
}

function Screen2({ navigation }) {

  return (
    <View style={{ flex: 1 }}>
      <Animated.View
        sharedTransitionTag="mleko"
        style={{width: '100%', height: 450, backgroundColor: 'green'}}
      />
      <AnimatedButton
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
          stackAnimation: 'fade',
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