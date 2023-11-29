import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import 'react-native-gesture-handler';

// import { SafeAreaView } from 'react-native-safe-area-context';

import { useSharedValue } from 'react-native-reanimated';

import { PropsWithChildren } from 'react';
import { TouchableOpacity } from 'react-native';
import Animated, {
  SharedValue,
  useAnimatedStyle,
  useDerivedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

type BottomSheetProps = PropsWithChildren<{
  isOpen: SharedValue<boolean>;
  toggleSheet: () => void;
  duration?: number;
}>;
const BottomSheet = ({
  isOpen,
  toggleSheet,
  duration = 500,
  children,
}: BottomSheetProps) => {
  const height = useSharedValue(0);
  const progress = useDerivedValue(() =>
    withTiming(isOpen.value ? 0 : 1, { duration })
  );

  const sheetStyle = useAnimatedStyle(() => ({
    ...sheetStyles.sheet,
    transform: [{ translateY: progress.value * 2 * height.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    ...sheetStyles.backdrop,
    opacity: 1 - progress.value,
    zIndex: isOpen.value
      ? 1
      : withDelay(duration, withTiming(-1, { duration: 0 })),
  }));

  return (
    <>
      <Animated.View style={backdropStyle}>
        <TouchableOpacity style={styles.flex} onPress={toggleSheet} />
      </Animated.View>
      <Animated.View
        onLayout={(e) => {
          height.value = e.nativeEvent.layout.height;
        }}
        style={sheetStyle}>
        {children}
      </Animated.View>
    </>
  );
};

const sheetStyles = StyleSheet.create({
  flex: { flex: 1 },

  sheet: {
    backgroundColor: 'white',
    padding: 16,
    height: 100,
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

function BottomSheetScreen() {
  const isOpen = useSharedValue(false);

  const toggleSheet = () => {
    isOpen.value = !isOpen.value;
  };

  return (
    <View style={styles.container}>
      <View style={styles.safeArea}>
        <View style={styles.flex} />
        <Pressable style={styles.toggleButton} onPress={toggleSheet}>
          <Text>Toggle bottom sheet</Text>
        </Pressable>
        <View style={styles.flex} />
      </View>
      <BottomSheet isOpen={isOpen} toggleSheet={toggleSheet}>
        <Text>Hello</Text>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flex: 1,
    height: 500,
  },
  toggleButton: {
    backgroundColor: '#fac',
    padding: 12,
    borderRadius: 48,
  },
  safeArea: { alignItems: 'center', justifyContent: 'center', flex: 1 },
});

export default BottomSheetScreen;
