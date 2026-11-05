import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { NavigationContainer, useIsFocused } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Animated, { SharedTransitionBoundary } from 'react-native-reanimated';

type StackParamList = { List: undefined; Details: { color: string } };

const Stack = createNativeStackNavigator<StackParamList>();
const COLORS = ['#b58df1', '#87cce8', '#ffa3a1', '#b1dfd0'];

function ListScreen({
  navigation,
}: NativeStackScreenProps<StackParamList, 'List'>) {
  return (
    <View style={styles.grid}>
      {COLORS.map((color) => (
        <Pressable
          key={color}
          onPress={() => navigation.navigate('Details', { color })}>
          <Animated.View
            sharedTransitionTag={color}
            style={[styles.card, { backgroundColor: color }]}
          />
        </Pressable>
      ))}
    </View>
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
