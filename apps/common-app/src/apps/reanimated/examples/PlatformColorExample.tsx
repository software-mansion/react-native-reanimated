import React from 'react';
import { View, Button, Platform } from 'react-native';
import { PlatformColor as RNPlatformColor } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  PlatformColor,
} from 'react-native-reanimated';

export default function PlatformColorExample() {
  const progress = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: withTiming(progress.value, { duration: 500 }),
      transform: [
        { scale: withTiming(progress.value ? 1.2 : 1, { duration: 500 }) },
      ],
      backgroundColor:
        Platform.OS === 'ios'
          ? PlatformColor('systemBlue')
          : PlatformColor('@android:color/holo_blue_bright'),
    };
  });

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View
        style={[{ width: 150, height: 150, borderRadius: 20 }, animatedStyle]}
      />
      <Button
        title="toggle"
        onPress={() => {
          progress.value = progress.value === 0 ? 1 : 0;
        }}
      />
    </View>
  );
}
