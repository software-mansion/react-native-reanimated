import React from 'react';
import { Button, StyleSheet } from 'react-native';
import { NavigationContainer, useIsFocused } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Animated, {
  SharedTransition,
  SharedTransitionBoundary,
} from 'react-native-reanimated';

type StackParamList = { A: undefined; B: undefined };

const Stack = createNativeStackNavigator<StackParamList>();

// Used when you go from A to B.
const springy = SharedTransition.springify();
// Used when you go back from B to A. On iOS, the native back navigation
// controls the progress instead.
const slow = SharedTransition.duration(1200);

function ScreenA({ navigation }: NativeStackScreenProps<StackParamList, 'A'>) {
  const isFocused = useIsFocused();

  return (
    <SharedTransitionBoundary isActive={isFocused}>
      <Animated.View
        sharedTransitionTag="photo"
        sharedTransitionStyle={springy}
        style={styles.small}
      />
      <Button title="Open B" onPress={() => navigation.navigate('B')} />
    </SharedTransitionBoundary>
  );
}

function ScreenB() {
  const isFocused = useIsFocused();

  return (
    <SharedTransitionBoundary isActive={isFocused}>
      <Animated.View
        sharedTransitionTag="photo"
        sharedTransitionStyle={slow}
        style={styles.large}
      />
    </SharedTransitionBoundary>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="A" component={ScreenA} />
        <Stack.Screen name="B" component={ScreenB} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  small: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: '#87cce8',
  },
  large: {
    alignSelf: 'center',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: '#87cce8',
  },
});
