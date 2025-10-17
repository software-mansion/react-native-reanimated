import React, { useEffect } from 'react';
import { View, Text, Button, Platform, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  PlatformColor,
  withTiming,
} from 'react-native-reanimated';

const Description = () => (
  <View style={styles.contentContainer}>
    <Text style={styles.header}>What is PlatformColor?</Text>
    <Text style={styles.paragraph}>
      PlatformColor gives you possibility to use platform-specific semantic
      colors - for example
      <Text style={{ fontWeight: 'bold' }}> systemBlue</Text> on iOS or
      <Text style={{ fontWeight: 'bold' }}>
        @android:color/holo_blue_bright
      </Text>{' '}
      on Android - ensuring your app automatically adapts to the phone theme and
      stays consistent with native UI elements.
    </Text>
    <Text style={styles.header}>What this example does?</Text>
    <Text style={styles.paragraph}>
      This example should animate width correctly when static platform-defined
      color is applied. In the future we should extend this feature to support
      fully animated PlatformColor transitions.
    </Text>
  </View>
);

export default function PlatformColorExample() {
  const width = useSharedValue(100);

  useEffect(() => {
    const interval = setInterval(() => {
      width.value = withTiming(width.value === 100 ? 200 : 100);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    width: width.value,
    backgroundColor:
      Platform.OS === 'ios'
        ? PlatformColor('systemBlue')
        : PlatformColor('@android:color/holo_blue_bright'),
  }));

  return (
    <View style={styles.container}>
      <Description />
      <Animated.View style={[styles.box, animatedStyle]} />
      <Button
        title="Toggle width"
        onPress={() => {
          width.value = withTiming(width.value === 100 ? 200 : 100);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-evenly',
    alignItems: 'center',
    backgroundColor: '#E3E6EA',
  },
  header: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#001a72',
    fontFamily: 'Poppins',
  },
  paragraph: { marginBottom: 10, fontFamily: 'Poppins', color: '#001a72' },
  box: { height: 100, width: 100, borderRadius: 20 },
  contentContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    padding: 16,
    borderRadius: 10,
    backgroundColor: 'white',
  },
});
