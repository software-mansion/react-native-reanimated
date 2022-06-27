import * as React from 'react';
import {
  Button,
  View,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import {
  createNativeStackNavigator,
  NativeStackNavigationProp,
} from 'react-native-screens/native-stack';
import Animated, {
  withTiming,
  SharedTransition,
  withSpring
} from 'react-native-reanimated';

const Stack = createNativeStackNavigator();

type SimpleStackParams = {
  First: undefined;
  Second: undefined;
};

// const transition = SharedTransition.custom((values: any) => {
//   'worklet';
//   return {
//     height: withTiming(values.targetHeight),
//     originY: withTiming(values.targetOriginY),
//   }
// });

// const transition = SharedTransition.custom((values: any) => {
//   'worklet';
//   return {
//     height: withSpring(values.targetHeight),
//     originY: withSpring(values.targetOriginY),
//   }
// });

function Screen1({ navigation }) {
  return (
    <Animated.ScrollView style={{ flex: 1 }}>
      <Animated.View
        style={{ width: '100%', height: 100, backgroundColor: 'green' }}
        sharedTransitionTag="mleko"
        // sharedTransitionStyle={transition}
      />
      <Button onPress={() => navigation.navigate('Screen2')} title="go to screen2" />
    </Animated.ScrollView>
  );
}

function Screen2({ navigation }) {

  return (
    <View style={{ flex: 1 }}>
      <Animated.View
        style={{ width: '100%', height: 200, backgroundColor: 'green', marginTop: 100 }}
        sharedTransitionTag="mleko"
        // sharedTransitionStyle={transition}
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
    <View style={{ flex: 1 }}>
      <Animated.View
        style={{ width: '50%', height: 100, backgroundColor: 'red', opacity: 0.5 }}
        sharedTransitionTag="mleko123"
        // sharedTransitionStyle={transition}
      />
      <Button
        title="go to screen4"
        onPress={() => navigation.navigate('Screen4')}
      />
      <Button
        title="go back"
        onPress={() => navigation.navigate('Screen2')}
      />
    </View>
  );
}

function Screen4({ navigation }) {

  return (
    <View style={{ flex: 1 }}>
      <Animated.View
        style={{ width: '50%', height: 200, backgroundColor: 'red', opacity: 0.5 }}
        sharedTransitionTag="mleko123"
        // sharedTransitionStyle={transition}
      />
      <Button
        title="go back to screen1"
        onPress={() => navigation.navigate('Screen1')}
      />
    </View>
  );
}

export default function App() {
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
        <Stack.Screen
          name="Screen3"
          component={Screen3}
          options={{ headerShown: true }}
        />
        <Stack.Screen
          name="Screen4"
          component={Screen4}
          options={{ headerShown: true }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
