import * as React from 'react';
import { View, Button } from 'react-native';
import { ParamListBase } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Animated, {
  Layout,
  // SharedTransition,
  // withSpring,
} from 'react-native-reanimated';
import { StackScreenProps } from '@react-navigation/stack';

const Stack = createNativeStackNavigator();

// const transition = SharedTransition.custom((values) => {
//   'worklet';
//   return {
//     height: withSpring(values.targetHeight),
//     width: withSpring(values.targetWidth),
//     originX: withSpring(values.targetOriginX),
//     originY: withSpring(values.targetOriginY),
//   };
// });

function Screen1({ navigation }: StackScreenProps<ParamListBase>) {
  const [width, setWidth] = React.useState(100);

  const toggleWidth = () => {
    setWidth((w) => (w === 400 ? 100 : 400));
  };
  return (
    <Animated.ScrollView style={{ flex: 1 }}>
      <Animated.View
        style={{
          width: width,
          height: 150,
          marginLeft: 20,
          marginTop: 50,
          backgroundColor: 'green',
        }}
        // sharedTransitionTag="mleko"
        // sharedTransitionStyle={transition}
        layout={Layout.duration(2000)}
      />
      <Button
        onPress={() => navigation.navigate('Screen2')}
        title="go to screen2"
      />
      <Button title="layout" onPress={toggleWidth} />
    </Animated.ScrollView>
  );
}

function Screen2({ navigation }: StackScreenProps<ParamListBase>) {
  const [width, setWidth] = React.useState(200);

  const toggleWidth = () => {
    setWidth((w) => (w % 400) + 200);
  };

  return (
    <View style={{ flex: 1 }}>
      <Animated.View
        style={{
          width,
          height: 300,
          marginLeft: 60,
          marginTop: 100,
          backgroundColor: 'green',
        }}
        // sharedTransitionTag="mleko"
        // sharedTransitionStyle={transition}
        layout={Layout.duration(2000)}
      />
      <Button title="go back" onPress={() => navigation.navigate('Screen1')} />
      <Button title="layout" onPress={toggleWidth} />
    </View>
  );
}

export function TransitionWithLayoutExample() {
  return (
    // <NavigationContainer>
    <Stack.Navigator
      screenOptions={{
        animation: 'none',
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
    // </NavigationContainer>
  );
}
