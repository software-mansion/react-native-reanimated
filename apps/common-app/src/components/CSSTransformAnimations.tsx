import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import Animated from 'react-native-reanimated';

const SQUARE_SIZE = 80;

interface Props {
  onBack: () => void;
}

interface BoxState {
  translateX: number;
  translateY: number;
  rotate: number;
  scale: number;
  skewX: number;
  skewY: number;
  opacity: number;
  backgroundColor: string;
  shadowOpacity: number;
  width: number;
  borderRadius: number;
}

type NumericKey =
  | 'translateX'
  | 'translateY'
  | 'rotate'
  | 'scale'
  | 'skewX'
  | 'skewY'
  | 'opacity'
  | 'shadowOpacity'
  | 'width'
  | 'borderRadius';

const initialState: BoxState = {
  translateX: 0,
  translateY: 0,
  rotate: 0,
  scale: 1,
  skewX: 0,
  skewY: 0,
  opacity: 1,
  backgroundColor: '#3498db',
  shadowOpacity: 0.25,
  width: SQUARE_SIZE,
  borderRadius: 12,
};

export default function CSSTransformAnimations({ onBack }: Props) {
  const [boxState, setBoxState] = useState<BoxState>(initialState);
  const sequenceTimeouts = useRef<Array<ReturnType<typeof setTimeout>>>([]);

  const toggleNumeric = (key: NumericKey, activeValue: number) => {
    setBoxState((prev) => ({
      ...prev,
      [key]: prev[key] === activeValue ? initialState[key] : activeValue,
    }));
  };

  const toggleBackground = () => {
    setBoxState((prev) => ({
      ...prev,
      backgroundColor:
        prev.backgroundColor === '#3498db' ? '#e74c3c' : '#3498db',
    }));
  };

  const scheduleState = (partial: Partial<BoxState>, delay: number) => {
    const timeoutId = setTimeout(() => {
      setBoxState((prev) => ({
        ...prev,
        ...partial,
      }));
    }, delay);
    sequenceTimeouts.current.push(timeoutId);
  };

  const clearSequenceTimeouts = () => {
    sequenceTimeouts.current.forEach(clearTimeout);
    sequenceTimeouts.current = [];
  };

  const animateSequence = () => {
    clearSequenceTimeouts();
    scheduleState({ translateX: 60, translateY: -40 }, 0);
    scheduleState({ rotate: 180 }, 350);
    scheduleState({ translateX: -40 }, 700);
    scheduleState({ rotate: 360 }, 1050);
    scheduleState({ translateX: 0, translateY: 0, rotate: 0 }, 1400);
  };

  const animateBounce = () => {
    clearSequenceTimeouts();
    const steps = [
      { translateY: -50, delay: 0 },
      { translateY: 0, delay: 250 },
      { translateY: -30, delay: 500 },
      { translateY: 0, delay: 750 },
    ];
    steps.forEach(({ translateY, delay }) =>
      scheduleState({ translateY }, delay)
    );
  };

  const animatePulse = () => {
    clearSequenceTimeouts();
    const steps = [
      { scale: 1.4, opacity: 0.6, delay: 0 },
      { scale: 1, opacity: 1, delay: 500 },
    ];
    steps.forEach(({ scale, opacity, delay }) =>
      scheduleState({ scale, opacity }, delay)
    );
  };

  const resetAll = () => {
    clearSequenceTimeouts();
    setBoxState(initialState);
  };

  useEffect(() => () => clearSequenceTimeouts(), []);

  // CSS transitions (RN Web) keep these transform tweaks fluid without shared values.
  const animatedStyle = {
    transform: [
      { translateX: boxState.translateX },
      { translateY: boxState.translateY },
      { rotate: `${boxState.rotate}deg` },
      { scale: boxState.scale },
      { skewX: `${boxState.skewX}deg` },
      { skewY: `${boxState.skewY}deg` },
    ],
    opacity: boxState.opacity,
    backgroundColor: boxState.backgroundColor,
    shadowColor: '#000',
    shadowOpacity: boxState.shadowOpacity,
    shadowRadius: 8,
    width: boxState.width,
    borderRadius: boxState.borderRadius,
    transitionProperty: [
      'transform',
      'opacity',
      'backgroundColor',
      'width',
      'borderRadius',
      'shadowOpacity',
    ],
    transitionDuration: 450,
    transitionTimingFunction: 'ease-in-out',
  } as const;

  const buttons = [
    { title: 'Translate X', onPress: () => toggleNumeric('translateX', 80) },
    { title: 'Translate Y', onPress: () => toggleNumeric('translateY', -80) },
    { title: 'Rotate', onPress: () => toggleNumeric('rotate', 360) },
    { title: 'Scale', onPress: () => toggleNumeric('scale', 1.5) },
    { title: 'Skew X', onPress: () => toggleNumeric('skewX', 25) },
    { title: 'Skew Y', onPress: () => toggleNumeric('skewY', 25) },
    { title: 'Opacity', onPress: () => toggleNumeric('opacity', 0.2) },
    { title: 'Background', onPress: toggleBackground },
    { title: 'Shadow', onPress: () => toggleNumeric('shadowOpacity', 0.8) },
    {
      title: 'Width',
      onPress: () => toggleNumeric('width', SQUARE_SIZE * 1.4),
    },
    { title: 'Corners', onPress: () => toggleNumeric('borderRadius', 40) },
    { title: 'Sequence', onPress: animateSequence },
    { title: 'Bounce', onPress: animateBounce },
    { title: 'Pulse', onPress: animatePulse },
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
        <Text style={styles.title}>CSS Transform Animations</Text>
        <Text style={styles.subtitle}>
          All interactions run through CSS transitions on React Native Web.
        </Text>
        <View style={styles.buttonGrid}>
          {buttons.map((button) => (
            <TouchableOpacity
              key={button.title}
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
    marginBottom: 10,
    color: '#2c3e50',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    color: '#7f8c8d',
  },
  buttonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingBottom: 40,
  },
  button: {
    backgroundColor: '#2980b9',
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
