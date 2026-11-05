import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { NavigationContainer, useIsFocused } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Animated, {
  SharedTransition,
  SharedTransitionBoundary,
} from 'react-native-reanimated';

type StackParamList = { Today: undefined; Details: undefined };

const Stack = createNativeStackNavigator<StackParamList>();

const transition = SharedTransition.fadeContent({
  fadeOut: { end: 0.5 },
  fadeIn: { duration: 250 },
});

function TodayScreen({
  navigation,
}: NativeStackScreenProps<StackParamList, 'Today'>) {
  const isFocused = useIsFocused();

  return (
    <SharedTransitionBoundary isActive={isFocused}>
      <Pressable onPress={() => navigation.navigate('Details')}>
        <Animated.View
          sharedTransitionTag="sun"
          sharedTransitionStyle={transition}
          style={styles.card}>
          <Text style={styles.title}>Sun</Text>
          <Text style={styles.subtitle}>Clear sky all day</Text>
        </Animated.View>
      </Pressable>
    </SharedTransitionBoundary>
  );
}

function DetailsScreen() {
  const isFocused = useIsFocused();

  return (
    <SharedTransitionBoundary isActive={isFocused}>
      <Animated.View
        sharedTransitionTag="sun"
        sharedTransitionStyle={transition}
        style={styles.header}>
        <Text style={styles.icon}>☀</Text>
        <Text style={styles.headline}>Sun</Text>
      </Animated.View>
    </SharedTransitionBoundary>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Today" component={TodayScreen} />
        <Stack.Screen name="Details" component={DetailsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    margin: 16,
    padding: 16,
    borderRadius: 20,
    backgroundColor: '#f6a04d',
  },
  title: { fontSize: 18, fontWeight: '700', color: 'white' },
  subtitle: { color: 'white' },
  header: {
    height: 260,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f6a04d',
  },
  icon: { fontSize: 64, color: 'white' },
  headline: { fontSize: 32, fontWeight: '800', color: 'white' },
});
