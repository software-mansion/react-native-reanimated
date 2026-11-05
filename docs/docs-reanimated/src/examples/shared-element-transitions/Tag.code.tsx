import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { NavigationContainer, useIsFocused } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Animated, { SharedTransitionBoundary } from 'react-native-reanimated';

type StackParamList = { Photos: undefined; Details: { id: string } };

const Stack = createNativeStackNavigator<StackParamList>();
const PHOTOS = ['lavender', 'lagoon', 'coast'];

function PhotosScreen({
  navigation,
}: NativeStackScreenProps<StackParamList, 'Photos'>) {
  const isFocused = useIsFocused();

  return (
    <SharedTransitionBoundary isActive={isFocused}>
      {PHOTOS.map((id) => (
        <Pressable
          key={id}
          style={styles.row}
          onPress={() => navigation.navigate('Details', { id })}>
          <Animated.View sharedTransitionTag={id} style={styles.thumbnail} />
          <Text>{id}</Text>
        </Pressable>
      ))}
    </SharedTransitionBoundary>
  );
}

function DetailsScreen({
  route,
}: NativeStackScreenProps<StackParamList, 'Details'>) {
  const isFocused = useIsFocused();

  return (
    <SharedTransitionBoundary isActive={isFocused}>
      <Animated.View
        sharedTransitionTag={route.params.id}
        style={styles.photo}
      />
    </SharedTransitionBoundary>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Photos" component={PhotosScreen} />
        <Stack.Screen name="Details" component={DetailsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  thumbnail: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#87cce8',
  },
  photo: {
    margin: 16,
    height: 240,
    borderRadius: 24,
    backgroundColor: '#87cce8',
  },
});
