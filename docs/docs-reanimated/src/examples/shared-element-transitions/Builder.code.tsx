import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { NavigationContainer, useIsFocused } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Animated, {
  Easing,
  SharedTransition,
  SharedTransitionBoundary,
} from 'react-native-reanimated';

type StackParamList = { Library: undefined; Player: undefined };

const Stack = createNativeStackNavigator<StackParamList>();

const transition = SharedTransition.duration(800).easing(
  Easing.out(Easing.exp)
);
// Or a spring:
// const transition = SharedTransition.springify(650).dampingRatio(0.85);

function LibraryScreen({
  navigation,
}: NativeStackScreenProps<StackParamList, 'Library'>) {
  const isFocused = useIsFocused();

  return (
    <SharedTransitionBoundary isActive={isFocused}>
      <Pressable onPress={() => navigation.navigate('Player')}>
        <Animated.View
          sharedTransitionTag="cover"
          sharedTransitionStyle={transition}
          style={styles.miniCover}
        />
      </Pressable>
    </SharedTransitionBoundary>
  );
}

function PlayerScreen() {
  const isFocused = useIsFocused();

  return (
    <SharedTransitionBoundary isActive={isFocused}>
      <Animated.View
        sharedTransitionTag="cover"
        sharedTransitionStyle={transition}
        style={styles.cover}
      />
    </SharedTransitionBoundary>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Library" component={LibraryScreen} />
        <Stack.Screen name="Player" component={PlayerScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  miniCover: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#ffa3a1',
  },
  cover: {
    margin: 24,
    aspectRatio: 1,
    borderRadius: 24,
    backgroundColor: '#ffa3a1',
  },
});
