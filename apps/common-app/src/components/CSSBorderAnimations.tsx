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

type BorderState = {
  borderRadius: number;
  borderTopLeftRadius: number;
  borderTopRightRadius: number;
  borderBottomLeftRadius: number;
  borderBottomRightRadius: number;
  borderWidth: number;
  borderTopWidth: number;
  borderBottomWidth: number;
  borderLeftWidth: number;
  borderRightWidth: number;
  borderColor: string;
  borderStyle: 'solid' | 'dashed';
};

type NumericBorderKeys = Exclude<
  keyof BorderState,
  'borderColor' | 'borderStyle'
>;

const initialState: BorderState = {
  borderRadius: 0,
  borderTopLeftRadius: 0,
  borderTopRightRadius: 0,
  borderBottomLeftRadius: 0,
  borderBottomRightRadius: 0,
  borderWidth: 0,
  borderTopWidth: 0,
  borderBottomWidth: 0,
  borderLeftWidth: 0,
  borderRightWidth: 0,
  borderColor: '#e74c3c',
  borderStyle: 'solid',
};

export default function CSSBorderAnimations({ onBack }: Props) {
  const [borderState, setBorderState] = useState(initialState);
  const sequenceTimeouts = useRef<Array<ReturnType<typeof setTimeout>>>([]);

  const toggleValue = (key: NumericBorderKeys, activeValue: number) => {
    setBorderState((prev) => ({
      ...prev,
      [key]: prev[key] === activeValue ? initialState[key] : activeValue,
    }));
  };

  const animateAllCorners = () => {
    setBorderState((prev) => {
      const targetValue = prev.borderTopLeftRadius === 0 ? 20 : 0;
      return {
        ...prev,
        borderTopLeftRadius: targetValue,
        borderTopRightRadius: targetValue,
        borderBottomLeftRadius: targetValue,
        borderBottomRightRadius: targetValue,
      };
    });
  };

  const toggleBorderColor = () => {
    setBorderState((prev) => ({
      ...prev,
      borderColor: prev.borderColor === '#e74c3c' ? '#27ae60' : '#e74c3c',
    }));
  };

  const toggleBorderStyle = () => {
    setBorderState((prev) => ({
      ...prev,
      borderStyle: prev.borderStyle === 'solid' ? 'dashed' : 'solid',
    }));
  };

  const clearSequenceTimeouts = () => {
    sequenceTimeouts.current.forEach(clearTimeout);
    sequenceTimeouts.current = [];
  };

  const runBorderWave = () => {
    clearSequenceTimeouts();
    const steps: Array<{
      delay: number;
      key: Extract<
        NumericBorderKeys,
        | 'borderTopWidth'
        | 'borderRightWidth'
        | 'borderBottomWidth'
        | 'borderLeftWidth'
      >;
      value: number;
    }> = [
      { delay: 0, key: 'borderTopWidth', value: 8 },
      { delay: 350, key: 'borderTopWidth', value: 0 },
      { delay: 350, key: 'borderRightWidth', value: 8 },
      { delay: 700, key: 'borderRightWidth', value: 0 },
      { delay: 700, key: 'borderBottomWidth', value: 8 },
      { delay: 1050, key: 'borderBottomWidth', value: 0 },
      { delay: 1050, key: 'borderLeftWidth', value: 8 },
      { delay: 1400, key: 'borderLeftWidth', value: 0 },
    ];

    steps.forEach(({ delay, key, value }) => {
      const timeoutId = setTimeout(() => {
        setBorderState((prev) => ({
          ...prev,
          [key]: value,
        }));
      }, delay);
      sequenceTimeouts.current.push(timeoutId);
    });
  };

  const resetAll = () => {
    clearSequenceTimeouts();
    setBorderState(initialState);
  };

  useEffect(() => {
    return () => clearSequenceTimeouts();
  }, []);

  // CSS transitions (supported on RN Web) keep these border tweaks smooth without shared values.
  const animatedStyle = {
    borderRadius: borderState.borderRadius,
    borderTopLeftRadius: borderState.borderTopLeftRadius,
    borderTopRightRadius: borderState.borderTopRightRadius,
    borderBottomLeftRadius: borderState.borderBottomLeftRadius,
    borderBottomRightRadius: borderState.borderBottomRightRadius,
    borderWidth: borderState.borderWidth,
    borderTopWidth: borderState.borderTopWidth,
    borderBottomWidth: borderState.borderBottomWidth,
    borderLeftWidth: borderState.borderLeftWidth,
    borderRightWidth: borderState.borderRightWidth,
    borderColor: borderState.borderColor,
    borderStyle: borderState.borderStyle,
    transitionProperty: [
      'borderRadius',
      'borderTopLeftRadius',
      'borderTopRightRadius',
      'borderBottomLeftRadius',
      'borderBottomRightRadius',
      'borderWidth',
      'borderTopWidth',
      'borderBottomWidth',
      'borderLeftWidth',
      'borderRightWidth',
      'borderColor',
      'borderStyle',
    ],
    transitionDuration: 400,
    transitionTimingFunction: 'ease-in-out',
  } as const;

  const buttons = [
    {
      title: 'Border Radius',
      onPress: () => toggleValue('borderRadius', SQUARE_SIZE / 2),
    },
    {
      title: 'Top Left',
      onPress: () => toggleValue('borderTopLeftRadius', 30),
    },
    {
      title: 'Top Right',
      onPress: () => toggleValue('borderTopRightRadius', 30),
    },
    {
      title: 'Bottom Left',
      onPress: () => toggleValue('borderBottomLeftRadius', 30),
    },
    {
      title: 'Bottom Right',
      onPress: () => toggleValue('borderBottomRightRadius', 30),
    },
    { title: 'Border Width', onPress: () => toggleValue('borderWidth', 8) },
    { title: 'Top Border', onPress: () => toggleValue('borderTopWidth', 6) },
    {
      title: 'Bottom Border',
      onPress: () => toggleValue('borderBottomWidth', 6),
    },
    { title: 'Left Border', onPress: () => toggleValue('borderLeftWidth', 6) },
    {
      title: 'Right Border',
      onPress: () => toggleValue('borderRightWidth', 6),
    },
    { title: 'Border Color', onPress: toggleBorderColor },
    { title: 'Border Style', onPress: toggleBorderStyle },
    { title: 'All Corners', onPress: animateAllCorners },
    { title: 'Border Wave', onPress: runBorderWave },
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
        <Text style={styles.title}>CSS Border Animations</Text>
        <Text style={styles.subtitle}>
          These examples rely on CSS transitions (React Native Web) rather than
          shared values.
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
    backgroundColor: '#9b59b6',
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
