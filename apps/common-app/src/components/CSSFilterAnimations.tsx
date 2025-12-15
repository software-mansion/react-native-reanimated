import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import Animated from 'react-native-reanimated';

interface Props {
  onBack: () => void;
}

type FilterState = {
  blur: number;
  brightness: number;
  contrast: number;
  saturate: number;
  grayscale: number;
  hueRotate: number;
  invert: number;
  sepia: number;
  dropShadow: boolean;
};

const initialFilters: FilterState = {
  blur: 0,
  brightness: 1,
  contrast: 1,
  saturate: 1,
  grayscale: 0,
  hueRotate: 0,
  invert: 0,
  sepia: 0,
  dropShadow: false,
};

export default function CSSFilterAnimations({ onBack }: Props) {
  const [filters, setFilters] = useState<FilterState>(initialFilters);

  const toggleValue = <K extends keyof FilterState>(
    key: K,
    value: FilterState[K]
  ) => {
    setFilters((prev) => ({
      ...prev,
      [key]: prev[key] === value ? initialFilters[key] : value,
    }));
  };

  const resetAll = () => setFilters(initialFilters);

  const filterString = useMemo(() => {
    const dropShadow = filters.dropShadow
      ? '0px 16px 24px rgba(0,0,0,0.35)'
      : '0px 0px 0px rgba(0,0,0,0)';
    return [
      `blur(${filters.blur}px)`,
      `brightness(${filters.brightness})`,
      `contrast(${filters.contrast})`,
      `saturate(${filters.saturate})`,
      `grayscale(${filters.grayscale})`,
      //   `hue-rotate(${filters.hueRotate}deg)`,
      `invert(${filters.invert})`,
      `sepia(${filters.sepia})`,
      //   `drop-shadow(${dropShadow})`,
    ].join(' ');
  }, [filters]);

  // Filter property coverage comes from InterpolatorRegistry filter operations.
  const animatedStyle = {
    filter: filterString,
    transitionProperty: ['filter'],
    transitionDuration: 450,
    transitionTimingFunction: 'ease-in-out',
  } as const;

  const buttons = [
    { title: 'Blur', onPress: () => toggleValue('blur', 12) },
    { title: 'Brightness', onPress: () => toggleValue('brightness', 1.6) },
    { title: 'Contrast', onPress: () => toggleValue('contrast', 1.8) },
    { title: 'Saturate', onPress: () => toggleValue('saturate', 2) },
    { title: 'Grayscale', onPress: () => toggleValue('grayscale', 1) },
    { title: 'Hue Rotate', onPress: () => toggleValue('hueRotate', 180) },
    { title: 'Invert', onPress: () => toggleValue('invert', 1) },
    { title: 'Sepia', onPress: () => toggleValue('sepia', 1) },
    { title: 'Drop Shadow', onPress: () => toggleValue('dropShadow', true) },
    { title: 'Reset All', onPress: resetAll },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.animationContainer}>
        <Animated.View style={[styles.card, animatedStyle]}>
          <Text style={styles.cardTitle}>CSS Filters</Text>
          <Text style={styles.cardSubtitle}>
            Blur • Brightness • Contrast • Hue • Etc.
          </Text>
        </Animated.View>
      </View>

      <ScrollView
        style={styles.buttonsContainer}
        showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Back to Home</Text>
        </TouchableOpacity>
        <Text style={styles.title}>CSS Filter Animations</Text>
        <Text style={styles.subtitle}>
          Demonstrates every filter operation listed in `InterpolatorRegistry`.
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
    backgroundColor: '#10121a',
  },
  animationContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  card: {
    width: 260,
    borderRadius: 18,
    padding: 24,
    backgroundColor: '#1f2a44',
    borderWidth: 1,
    borderColor: '#3d4b6e',
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ecf0f1',
    marginBottom: 8,
  },
  cardSubtitle: {
    color: '#bdc3c7',
    fontSize: 14,
    lineHeight: 20,
  },
  buttonsContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    backgroundColor: '#f5f5f5',
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
    backgroundColor: '#34495e',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 10,
    width: '48%',
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
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
});
