import React from 'react';
import { useColorScheme } from '@mui/material';
import {
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useDerivedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

function BottomSheet({ isOpen, toggleSheet, duration = 500, children }) {
  const { colorScheme } = useColorScheme();
  const height = useSharedValue(0);
  const progress = useDerivedValue(() =>
    withTiming(isOpen.value ? 0 : 1, { duration })
  );

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: progress.value * 2 * height.value }],
  }));

  const backgroundColorSheetStyle = {
    backgroundColor: colorScheme === 'light' ? '#f8f9ff' : '#272B3C',
  };

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
    zIndex: isOpen.value
      ? 1
      : withDelay(duration, withTiming(-1, { duration: 0 })),
  }));

  return (
    <>
      <Animated.View style={[sheetStyles.backdrop, backdropStyle]}>
        <TouchableOpacity style={styles.flex} onPress={toggleSheet} />
      </Animated.View>
      <Animated.View
        onLayout={(e) => {
          height.value = e.nativeEvent.layout.height;
        }}
        style={[sheetStyles.sheet, sheetStyle, backgroundColorSheetStyle]}>
        {children}
      </Animated.View>
    </>
  );
}

const sheetStyles = StyleSheet.create({
  sheet: {
    padding: 16,
    paddingRight: '2rem',
    paddingLeft: '2rem',
    height: 150,
    width: '100%',
    position: 'absolute',
    bottom: 0,
    borderTopRightRadius: 20,
    borderTopLeftRadius: 20,
    zIndex: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
});

export default function App() {
  const { colorScheme } = useColorScheme();
  const isOpen = useSharedValue(false);

  const toggleSheet = () => {
    isOpen.value = !isOpen.value;
  };

  const contentStyle = {
    color: colorScheme === 'light' ? '#001a72' : '#f8f9ff',
    textDecorationColor: colorScheme === 'light' ? '#001a72' : '#f8f9ff',
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.safeArea}>
        <View style={styles.flex} />
        <Pressable style={styles.toggleButton} onPress={toggleSheet}>
          <Text style={styles.toggleButtonText}>Toggle bottom sheet</Text>
        </Pressable>
        <View style={styles.flex} />
      </View>
      <BottomSheet isOpen={isOpen} toggleSheet={toggleSheet}>
        <Animated.Text style={contentStyle}>
          Discover the indispensable convenience of a bottom sheet in mobile
          app. Seamlessly integrated, it provides quick access to supplementary
          features and refined details.
        </Animated.Text>
        <View style={styles.buttonContainer}>
          <Pressable style={[styles.bottomSheetButton]}>
            <Text style={[styles.bottomSheetButtonText, contentStyle]}>
              Read more
            </Text>
          </Pressable>
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    height: 250,
  },
  buttonContainer: {
    marginTop: 16,
    display: 'flex',
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-around',
  },
  toggleButton: {
    backgroundColor: '#b58df1',
    padding: 12,
    borderRadius: 48,
  },
  toggleButtonText: {
    color: 'white',
    padding: '0.5rem',
  },
  safeArea: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  bottomSheetButton: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 2,
  },
  bottomSheetButtonText: {
    fontWeight: 600,
    textDecorationLine: 'underline',
  },
});
