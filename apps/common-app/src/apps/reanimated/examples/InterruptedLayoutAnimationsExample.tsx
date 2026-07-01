import React, { useEffect, useState } from 'react';
import { Button, StyleSheet, View } from 'react-native';
import Animated, {
  LinearTransition,
  SlideInLeft,
  SlideOutRight,
} from 'react-native-reanimated';

export default function InterruptedLayoutAnimationsExample() {
  const [showAnimatedBox, setShowAnimatedBox] = useState(false);
  const [showExtraBox, setShowExtraBox] = useState(false);

  useEffect(() => {
    if (showAnimatedBox) {
      const unmountTimer = setTimeout(() => {
        setShowAnimatedBox(false);
      }, 1500);

      return () => clearTimeout(unmountTimer);
    }
  }, [showAnimatedBox]);

  useEffect(() => {
    if (showAnimatedBox) {
      const layoutTimer = setTimeout(() => {
        setShowExtraBox(true);
      }, 750);

      return () => clearTimeout(layoutTimer);
    }
  }, [showAnimatedBox]);

  // Handle exiting phase layout shifts
  useEffect(() => {
    if (!showAnimatedBox && showExtraBox) {
      const cleanupTimer = setTimeout(() => {
        setShowExtraBox(false);
      }, 2400);

      return () => {
        clearTimeout(cleanupTimer);
      };
    }
  }, [showAnimatedBox, showExtraBox]);

  const handlePress = () => {
    setShowAnimatedBox(true);
  };

  return (
    <View style={styles.container}>
      <Button title="Trigger Animation" onPress={handlePress} />

      <View style={styles.referenceBox} />

      {showExtraBox && <View style={styles.extraBox} />}

      {showAnimatedBox && (
        <Animated.View
          entering={SlideInLeft.duration(3000)}
          exiting={SlideOutRight.duration(2400)}
          layout={LinearTransition.duration(600)}
          style={styles.animatedBox}
        />
      )}

      <Animated.View
        style={styles.bottomBox}
        layout={LinearTransition.duration(showAnimatedBox ? 300 : 2400)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    gap: 10,
  },
  referenceBox: {
    backgroundColor: '#e0e0e0',
    height: 80,
  },
  extraBox: {
    backgroundColor: '#FF9800',
    height: 60,
  },
  animatedBox: {
    backgroundColor: '#4CAF50',
    height: 80,
  },
  bottomBox: {
    backgroundColor: '#2196F3',
    height: 80,
  },
});
