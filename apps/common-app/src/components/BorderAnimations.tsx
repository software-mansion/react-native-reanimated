import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  interpolateColor,
} from 'react-native-reanimated';

const SQUARE_SIZE = 80;

interface Props {
  onBack: () => void;
}

export default function BorderAnimations({ onBack }: Props) {
  // Border-specific animation values
  const borderRadius = useSharedValue(0);
  const borderTopLeftRadius = useSharedValue(0);
  const borderTopRightRadius = useSharedValue(0);
  const borderBottomLeftRadius = useSharedValue(0);
  const borderBottomRightRadius = useSharedValue(0);
  const borderWidth = useSharedValue(0);
  const borderTopWidth = useSharedValue(0);
  const borderBottomWidth = useSharedValue(0);
  const borderLeftWidth = useSharedValue(0);
  const borderRightWidth = useSharedValue(0);
  const borderColor = useSharedValue(0);
  const borderStyle = useSharedValue(0);

  // Animation functions
  const animateBorderRadius = () => {
    borderRadius.value = withSpring(
      borderRadius.value === 0 ? SQUARE_SIZE / 2 : 0
    );
  };

  const animateTopLeftRadius = () => {
    borderTopLeftRadius.value = withSpring(
      borderTopLeftRadius.value === 0 ? 30 : 0
    );
  };

  const animateTopRightRadius = () => {
    borderTopRightRadius.value = withSpring(
      borderTopRightRadius.value === 0 ? 30 : 0
    );
  };

  const animateBottomLeftRadius = () => {
    borderBottomLeftRadius.value = withSpring(
      borderBottomLeftRadius.value === 0 ? 30 : 0
    );
  };

  const animateBottomRightRadius = () => {
    borderBottomRightRadius.value = withSpring(
      borderBottomRightRadius.value === 0 ? 30 : 0
    );
  };

  const animateBorderWidth = () => {
    borderWidth.value = withSpring(borderWidth.value === 0 ? 8 : 0);
  };

  const animateTopBorder = () => {
    borderTopWidth.value = withSpring(borderTopWidth.value === 0 ? 6 : 0);
  };

  const animateBottomBorder = () => {
    borderBottomWidth.value = withSpring(borderBottomWidth.value === 0 ? 6 : 0);
  };

  const animateLeftBorder = () => {
    borderLeftWidth.value = withSpring(borderLeftWidth.value === 0 ? 6 : 0);
  };

  const animateRightBorder = () => {
    borderRightWidth.value = withSpring(borderRightWidth.value === 0 ? 6 : 0);
  };

  const animateBorderColor = () => {
    borderColor.value = withTiming(borderColor.value === 0 ? 1 : 0, {
      duration: 600,
    });
  };

  const animateBorderSequence = () => {
    borderTopWidth.value = withSequence(
      withTiming(8, { duration: 300 }),
      withTiming(0, { duration: 300 })
    );
    borderRightWidth.value = withSequence(
      withTiming(0, { duration: 300 }),
      withTiming(8, { duration: 300 }),
      withTiming(0, { duration: 300 })
    );
    borderBottomWidth.value = withSequence(
      withTiming(0, { duration: 600 }),
      withTiming(8, { duration: 300 }),
      withTiming(0, { duration: 300 })
    );
    borderLeftWidth.value = withSequence(
      withTiming(0, { duration: 900 }),
      withTiming(8, { duration: 300 }),
      withTiming(0, { duration: 300 })
    );
  };

  const animateAllCorners = () => {
    const targetValue = borderTopLeftRadius.value === 0 ? 20 : 0;
    borderTopLeftRadius.value = withSpring(targetValue);
    borderTopRightRadius.value = withSpring(targetValue);
    borderBottomLeftRadius.value = withSpring(targetValue);
    borderBottomRightRadius.value = withSpring(targetValue);
  };

  const resetAll = () => {
    borderRadius.value = withSpring(0);
    borderTopLeftRadius.value = withSpring(0);
    borderTopRightRadius.value = withSpring(0);
    borderBottomLeftRadius.value = withSpring(0);
    borderBottomRightRadius.value = withSpring(0);
    borderWidth.value = withSpring(0);
    borderTopWidth.value = withSpring(0);
    borderBottomWidth.value = withSpring(0);
    borderLeftWidth.value = withSpring(0);
    borderRightWidth.value = withSpring(0);
    borderColor.value = withTiming(0);
  };

  // Animated style
  const animatedStyle = useAnimatedStyle(() => {
    return {
      borderRadius: borderRadius.value,
      borderTopLeftRadius: borderTopLeftRadius.value,
      borderTopRightRadius: borderTopRightRadius.value,
      borderBottomLeftRadius: borderBottomLeftRadius.value,
      borderBottomRightRadius: borderBottomRightRadius.value,
      borderWidth: borderWidth.value,
      borderTopWidth: borderTopWidth.value,
      borderBottomWidth: borderBottomWidth.value,
      borderLeftWidth: borderLeftWidth.value,
      borderRightWidth: borderRightWidth.value,
      borderColor: interpolateColor(
        borderColor.value,
        [0, 1],
        ['#e74c3c', '#27ae60']
      ),
    };
  });

  const buttons = [
    { title: 'Border Radius', onPress: animateBorderRadius },
    { title: 'Top Left', onPress: animateTopLeftRadius },
    { title: 'Top Right', onPress: animateTopRightRadius },
    { title: 'Bottom Left', onPress: animateBottomLeftRadius },
    { title: 'Bottom Right', onPress: animateBottomRightRadius },
    { title: 'Border Width', onPress: animateBorderWidth },
    { title: 'Top Border', onPress: animateTopBorder },
    { title: 'Bottom Border', onPress: animateBottomBorder },
    { title: 'Left Border', onPress: animateLeftBorder },
    { title: 'Right Border', onPress: animateRightBorder },
    { title: 'Border Color', onPress: animateBorderColor },
    { title: 'All Corners', onPress: animateAllCorners },
    { title: 'Border Wave', onPress: animateBorderSequence },
    { title: 'Reset All', onPress: resetAll },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.animationContainer}>
        <Animated.View style={[styles.square, animatedStyle]} />
      </View>

      <ScrollView
        style={styles.buttonsContainer}
        showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Back to Home</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Border Animations</Text>
        <View style={styles.buttonGrid}>
          {buttons.map((button, index) => (
            <TouchableOpacity
              key={index}
              style={styles.button}
              onPress={button.onPress}>
              <Text style={styles.buttonText}>{button.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  animationContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 300,
  },
  square: {
    width: SQUARE_SIZE,
    height: SQUARE_SIZE,
    backgroundColor: '#3498db',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buttonsContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#2c3e50',
  },
  buttonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingBottom: 40,
  },
  button: {
    backgroundColor: '#e67e22',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 10,
    width: '48%',
    alignItems: 'center',
  },
  backButton: {
    backgroundColor: '#95a5a6',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 20,
    alignSelf: 'flex-start',
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});
