import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { NavigationContainer, useIsFocused } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Animated, {
  SharedTransition,
  SharedTransitionBoundary,
} from 'react-native-reanimated';

type StackParamList = { Albums: undefined; Album: undefined };

const Stack = createNativeStackNavigator<StackParamList>();

const transition = SharedTransition.progressAnimation((values, progress) => {
  'worklet';
  const mix = (from: number, to: number) => from + (to - from) * progress;
  return {
    originX: mix(values.currentOriginX, values.targetOriginX),
    originY: mix(values.currentOriginY, values.targetOriginY),
    width: mix(values.currentWidth, values.targetWidth),
    height: mix(values.currentHeight, values.targetHeight),
    borderRadius: 24 + Math.sin(Math.PI * progress) * 80,
  };
});

function AlbumsScreen({
  navigation,
}: NativeStackScreenProps<StackParamList, 'Albums'>) {
  const isFocused = useIsFocused();

  return (
    <SharedTransitionBoundary isActive={isFocused}>
      <Pressable onPress={() => navigation.navigate('Album')}>
        <Animated.View
          sharedTransitionTag="album"
          sharedTransitionStyle={transition}
          style={styles.thumbnail}
        />
      </Pressable>
    </SharedTransitionBoundary>
  );
}

function AlbumScreen() {
  const isFocused = useIsFocused();

  return (
    <SharedTransitionBoundary isActive={isFocused}>
      <Animated.View
        sharedTransitionTag="album"
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
        <Stack.Screen name="Albums" component={AlbumsScreen} />
        <Stack.Screen name="Album" component={AlbumScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  thumbnail: {
    margin: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#b58df1',
  },
  cover: {
    margin: 16,
    aspectRatio: 1,
    borderRadius: 24,
    backgroundColor: '#b58df1',
  },
});
