import * as React from 'react';
import { View, Button } from 'react-native';
import { NavigationContainer, ParamListBase } from '@react-navigation/native';
import {
  createNativeStackNavigator,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import Animated, {
  SharedTransition,
  useAnimatedReaction,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

const Stack = createNativeStackNavigator();

const transition = SharedTransition
  .setTransitionDuration(1000)
  .custom((values) => {
    'worklet';
    return {
      width: withSpring(values.targetWidth),
      height: withSpring(values.targetHeight),
      originX: withSpring(values.targetOriginX),
      originY: withSpring(values.targetOriginY),
    };
  })
  .progressAnimation((values, progress) => {
    'worklet';
    return {
      width: progress * (values.targetWidth - values.currentWidth) + values.currentWidth,
      height: progress * (values.targetHeight - values.currentHeight) + values.currentHeight,
      originX: progress * (values.targetOriginX - values.currentOriginX) + values.currentOriginX,
      originY: progress * (values.targetOriginY - values.currentOriginY) + values.currentOriginY,
    };
  });

function Screen1({ navigation }: NativeStackScreenProps<ParamListBase>) {
  return (
    <Animated.ScrollView style={{ flex: 1 }}>
      <Animated.View
        style={{
          width: 150,
          height: 150,
          marginLeft: 20,
          marginTop: 50,
          backgroundColor: 'green',
        }}
        sharedTransitionTag="tag"
        sharedTransitionType='progress'
        sharedTransitionStyle={transition}
      />
      <Button
        onPress={() => navigation.navigate('Screen2')}
        title="go to screen2"
      />
    </Animated.ScrollView>
  );
}

function Screen2({ navigation }: NativeStackScreenProps<ParamListBase>) {
  return (
    <View style={{ flex: 1 }}>
      <Animated.View
        style={{
          width: 200,
          height: 300,
          marginLeft: 60,
          marginTop: 100,
          backgroundColor: 'green',
        }}
        sharedTransitionTag="tag"
        sharedTransitionStyle={transition}
      />
      <Button title="go back" onPress={() => navigation.navigate('Screen1')} />
    </View>
  );
}

export default function CustomTransitionExample() {
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
    </Stack.Navigator>
    </NavigationContainer>
  );
}
