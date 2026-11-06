import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { NavigationContainer, useIsFocused } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Animated, {
  Easing,
  SharedTransition,
  SharedTransitionBoundary,
  withTiming,
} from 'react-native-reanimated';

type StackParamList = { Trips: undefined; Details: undefined };

const Stack = createNativeStackNavigator<StackParamList>();

const arc = SharedTransition.custom((values) => {
  'worklet';
  const config = { duration: 600 };
  return {
    originX: withTiming(values.targetOriginX, {
      ...config,
      easing: Easing.linear,
    }),
    originY: withTiming(values.targetOriginY, {
      ...config,
      easing: Easing.out(Easing.quad),
    }),
    width: withTiming(values.targetWidth, config),
    height: withTiming(values.targetHeight, config),
    borderRadius: withTiming(values.targetBorderRadius, config),
  };
});

function TripsScreen({
  navigation,
}: NativeStackScreenProps<StackParamList, 'Trips'>) {
  const isFocused = useIsFocused();

  return (
    <SharedTransitionBoundary isActive={isFocused}>
      <Pressable
        style={styles.corner}
        onPress={() => navigation.navigate('Details')}>
        <Animated.View
          sharedTransitionTag="trip"
          sharedTransitionStyle={arc}
          style={styles.bubble}
        />
      </Pressable>
    </SharedTransitionBoundary>
  );
}

function DetailsScreen() {
  const isFocused = useIsFocused();

  return (
    <SharedTransitionBoundary isActive={isFocused}>
      <Animated.View
        sharedTransitionTag="trip"
        sharedTransitionStyle={arc}
        style={styles.photo}
      />
    </SharedTransitionBoundary>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Trips" component={TripsScreen} />
        <Stack.Screen name="Details" component={DetailsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  corner: { position: 'absolute', right: 24, bottom: 48 },
  bubble: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#b1dfd0',
  },
  photo: {
    margin: 16,
    width: 160,
    height: 160,
    borderRadius: 24,
    backgroundColor: '#b1dfd0',
  },
});
