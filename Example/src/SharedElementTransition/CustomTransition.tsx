import * as React from 'react';
import { View, Button } from 'react-native';
import { ParamListBase } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Animated, {
  SharedTransition,
  withSpring,
} from 'react-native-reanimated';
import { StackScreenProps } from '@react-navigation/stack';

const Stack = createNativeStackNavigator();

const transition = SharedTransition.custom((values) => {
  'worklet';
  return {
    width: withSpring(values.targetWidth),
    height: withSpring(values.targetHeight),
    originX: withSpring(values.targetOriginX),
    originY: withSpring(values.targetOriginY),
  };
});

const progressAnimation = SharedTransition.progressAnimation((values, progress) => {
  'worklet';
  return {
    width: progress * (values.currentWidth - values.targetWidth) + values.currentWidth,
    height: progress * (values.currentHeight - values.targetHeight) + values.currentHeight,
    originX: progress * (values.currentOriginX - values.targetOriginX) + values.currentOriginX,
    originY: progress * (values.currentOriginY - values.targetOriginY) + values.currentOriginY,
  };
});

function Screen1({ navigation }: StackScreenProps<ParamListBase>) {
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
        sharedTransitionStyle={transition}
        sharedTransitionProgress={progressAnimation}
      />
      <Button
        onPress={() => navigation.navigate('Screen2')}
        title="go to screen2"
      />
    </Animated.ScrollView>
  );
}

function Screen2({ navigation }: StackScreenProps<ParamListBase>) {
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
  );
}
