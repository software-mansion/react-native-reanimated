import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useColorMode } from '@docusaurus/theme-common';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
} from 'react-native-reanimated';

export default function SpringBasicExample({ initialOffset = 200 }) {
  const colorModeStyles =
    useColorMode().colorMode === 'dark' ? darkStyles : lightStyles;
  const offset = useSharedValue(initialOffset);

  const animatedStyles = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value }],
  }));

  React.useEffect(() => {
    offset.value = withRepeat(withSpring(-offset.value), -1, true);
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[styles.box, animatedStyles, colorModeStyles.box]}
      />
    </View>
  );
}

const darkStyles = StyleSheet.create({
  box: {
    backgroundColor: 'var(--swm-purple-dark-80)',
  },
});

const lightStyles = StyleSheet.create({
  box: {
    backgroundColor: 'var(--swm-purple-light-100)',
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  box: {
    height: 120,
    width: 120,
    borderRadius: 100,
  },
});
