import React from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { NavigationContainer, useIsFocused } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Animated, { SharedTransitionBoundary } from 'react-native-reanimated';

type StackParamList = { List: undefined; Details: { color: string } };

const Stack = createNativeStackNavigator<StackParamList>();
const COLORS = [
  { name: 'Purple', color: '#b58df1' },
  { name: 'Blue', color: '#87cce8' },
  { name: 'Pink', color: '#ffa3a1' },
  { name: 'Mint', color: '#b1dfd0' },
];

function ListScreen({
  navigation,
}: NativeStackScreenProps<StackParamList, 'List'>) {
  return (
    <ScrollView contentContainerStyle={styles.grid}>
      {COLORS.map(({ name, color }) => (
        <Pressable
          key={color}
          accessibilityRole="button"
          accessibilityLabel={name}
          onPress={() => navigation.navigate('Details', { color })}>
          <Animated.View
            sharedTransitionTag={color}
            style={[styles.card, { backgroundColor: color }]}
          />
        </Pressable>
      ))}
    </ScrollView>
  );
}

function DetailsScreen({
  route,
}: NativeStackScreenProps<StackParamList, 'Details'>) {
  const { color } = route.params;

  return (
    <Animated.View
      sharedTransitionTag={color}
      style={[styles.hero, { backgroundColor: color }]}
    />
  );
}

function ScreenBoundary({ children }: { children: React.ReactNode }) {
  const isFocused = useIsFocused();

  return (
    <SharedTransitionBoundary isActive={isFocused}>
      {children}
    </SharedTransitionBoundary>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenLayout={({ children }) => (
          <ScreenBoundary>{children}</ScreenBoundary>
        )}>
        <Stack.Screen name="List" component={ListScreen} />
        <Stack.Screen name="Details" component={DetailsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, padding: 16 },
  card: { width: 150, height: 180, borderRadius: 20 },
  hero: { width: '100%', height: 360 },
});
