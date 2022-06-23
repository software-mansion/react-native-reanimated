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
  SharedTransition
} from 'react-native-reanimated';

const Stack = createNativeStackNavigator();

type SimpleStackParams = {
  First: undefined;
  Second: undefined;
};

const transition = SharedTransition.custom((values: any) => {
  'worklet';
  return {
    height: withTiming(values.targetHeight),
    originY: withTiming(values.targetOriginY),
  }
});

function First({ navigation }: {
  navigation: NativeStackNavigationProp<SimpleStackParams, 'First'>;
}) {

  return (
    <Animated.ScrollView style={{ flex: 1 }}>
      <Animated.View
        style={{ width: '100%', height: 100, backgroundColor: 'green' }}
        sharedTransitionTag="mleko"
        // sharedTransitionStyle={transition}
      />
      <Button onPress={() => navigation.navigate('Second')} title="Click" />
    </Animated.ScrollView>
  );
}

function Second({ navigation }: {
  navigation: NativeStackNavigationProp<SimpleStackParams, 'Second'>;
}) {

  return (
    <View style={{ flex: 1 }}>
      <Animated.View
        style={{ width: '100%', height: 200, backgroundColor: 'green' }}
        sharedTransitionTag="mleko"
        // sharedTransitionStyle={transition}
      />
      <Button
        title="Tap me for first screen"
        onPress={() => navigation.navigate('First')}
      />
    </View>
  );
}

export default function App(): JSX.Element {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          stackAnimation: 'fade',
        }}>
        <Stack.Screen
          name="First"
          component={First}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Second"
          component={Second}
          options={{ headerShown: true }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
