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

type NumericKeys =
  | 'margin'
  | 'marginTop'
  | 'marginBottom'
  | 'marginLeft'
  | 'marginRight'
  | 'marginHorizontal'
  | 'marginVertical'
  | 'padding'
  | 'paddingTop'
  | 'paddingBottom'
  | 'paddingLeft'
  | 'paddingRight';

type BoxState = Record<NumericKeys, number>;

const initialState: BoxState = {
  margin: 0,
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  marginHorizontal: 0,
  marginVertical: 0,
  padding: 10,
  paddingTop: 10,
  paddingBottom: 10,
  paddingLeft: 10,
  paddingRight: 10,
};

export default function CSSMarginAnimations({ onBack }: Props) {
  const [boxState, setBoxState] = useState<BoxState>(initialState);
  const sequenceTimeouts = useRef<Array<ReturnType<typeof setTimeout>>>([]);

  const toggleValue = (key: NumericKeys, value: number) => {
    setBoxState((prev) => ({
      ...prev,
      [key]: prev[key] === value ? initialState[key] : value,
    }));
  };

  const animateMarginWave = () => {
    clearSequenceTimeouts();
    const waveSteps: Array<{ key: NumericKeys; value: number; delay: number }> =
      [
        { key: 'marginTop', value: 30, delay: 0 },
        { key: 'marginTop', value: 0, delay: 350 },
        { key: 'marginRight', value: 30, delay: 350 },
        { key: 'marginRight', value: 0, delay: 700 },
        { key: 'marginBottom', value: 30, delay: 700 },
        { key: 'marginBottom', value: 0, delay: 1050 },
        { key: 'marginLeft', value: 30, delay: 1050 },
        { key: 'marginLeft', value: 0, delay: 1400 },
      ];

    waveSteps.forEach(({ key, value, delay }) => {
      const timeoutId = setTimeout(() => {
        setBoxState((prev) => ({
          ...prev,
          [key]: value,
        }));
      }, delay);
      sequenceTimeouts.current.push(timeoutId);
    });
  };

  const animateBreathing = () => {
    clearSequenceTimeouts();
    const sequence = [30, 10, 25, 10];
    sequence.forEach((value, index) => {
      const timeoutId = setTimeout(() => {
        setBoxState((prev) => ({
          ...prev,
          padding: value,
          paddingTop: value,
          paddingBottom: value,
          paddingLeft: value,
          paddingRight: value,
        }));
      }, index * 800);
      sequenceTimeouts.current.push(timeoutId);
    });
  };

  const clearSequenceTimeouts = () => {
    sequenceTimeouts.current.forEach(clearTimeout);
    sequenceTimeouts.current = [];
  };

  const resetAll = () => {
    clearSequenceTimeouts();
    setBoxState(initialState);
  };

  useEffect(() => () => clearSequenceTimeouts(), []);

  // CSS transitions ensure the margin/padding tweaks animate smoothly on RN Web without shared values.
  const animatedStyle = {
    margin: boxState.margin,
    marginTop: boxState.marginTop,
    marginBottom: boxState.marginBottom,
    marginLeft: boxState.marginLeft,
    marginRight: boxState.marginRight,
    marginHorizontal: boxState.marginHorizontal,
    marginVertical: boxState.marginVertical,
    padding: boxState.padding,
    paddingTop: boxState.paddingTop,
    paddingBottom: boxState.paddingBottom,
    paddingLeft: boxState.paddingLeft,
    paddingRight: boxState.paddingRight,
    transitionProperty: [
      'margin',
      'marginTop',
      'marginBottom',
      'marginLeft',
      'marginRight',
      'marginHorizontal',
      'marginVertical',
      'padding',
      'paddingTop',
      'paddingBottom',
      'paddingLeft',
      'paddingRight',
    ],
    transitionDuration: 400,
    transitionTimingFunction: 'ease-in-out',
  } as const;

  const buttons = [
    { title: 'Margin', onPress: () => toggleValue('margin', 20) },
    { title: 'Margin Top', onPress: () => toggleValue('marginTop', 40) },
    { title: 'Margin Bottom', onPress: () => toggleValue('marginBottom', 40) },
    { title: 'Margin Left', onPress: () => toggleValue('marginLeft', 40) },
    { title: 'Margin Right', onPress: () => toggleValue('marginRight', 40) },
    {
      title: 'Margin H',
      onPress: () => toggleValue('marginHorizontal', 30),
    },
    {
      title: 'Margin V',
      onPress: () => toggleValue('marginVertical', 30),
    },
    { title: 'Padding', onPress: () => toggleValue('padding', 30) },
    { title: 'Padding Top', onPress: () => toggleValue('paddingTop', 30) },
    {
      title: 'Padding Bottom',
      onPress: () => toggleValue('paddingBottom', 30),
    },
    { title: 'Padding Left', onPress: () => toggleValue('paddingLeft', 30) },
    { title: 'Padding Right', onPress: () => toggleValue('paddingRight', 30) },
    { title: 'Margin Wave', onPress: animateMarginWave },
    { title: 'Breathing', onPress: animateBreathing },
    { title: 'Reset All', onPress: resetAll },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.animationContainer}>
        <View style={styles.boundaryBox}>
          <Animated.View style={[styles.square, animatedStyle]}>
            <View style={styles.innerContent}>
              <Text style={styles.innerText}>CSS Padding</Text>
            </View>
          </Animated.View>
        </View>
      </View>

      <ScrollView
        style={styles.buttonsContainer}
        showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Back to Home</Text>
        </TouchableOpacity>
        <Text style={styles.title}>CSS Margin & Padding</Text>
        <Text style={styles.subtitle}>
          These interactions run via CSS transitions on React Native Web.
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
  boundaryBox: {
    width: 200,
    height: 200,
    backgroundColor: '#ecf0f1',
    borderWidth: 2,
    borderColor: '#bdc3c7',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  square: {
    width: SQUARE_SIZE,
    height: SQUARE_SIZE,
    backgroundColor: '#8e44ad',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 3.5,
    elevation: 5,
  },
  innerContent: {
    backgroundColor: '#f1c40f',
    borderRadius: 8,
    minWidth: 30,
    minHeight: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerText: {
    color: '#2c3e50',
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 14,
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
    backgroundColor: '#6c5ce7',
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
