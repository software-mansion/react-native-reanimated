import React, { useEffect, useRef, useState } from 'react';
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

type BorderColorKeys =
  | 'borderColor'
  | 'borderTopColor'
  | 'borderRightColor'
  | 'borderBottomColor'
  | 'borderLeftColor';

type OutlineState = {
  borderColor: string;
  borderTopColor: string;
  borderRightColor: string;
  borderBottomColor: string;
  borderLeftColor: string;
  outlineColor: string;
  outlineWidth: number;
  outlineOffset: number;
  outlineStyle: 'solid' | 'dashed';
};

const initialState: OutlineState = {
  borderColor: '#3498db',
  borderTopColor: '#3498db',
  borderRightColor: '#3498db',
  borderBottomColor: '#3498db',
  borderLeftColor: '#3498db',
  outlineColor: '#8e44ad',
  outlineWidth: 0,
  outlineOffset: 0,
  outlineStyle: 'solid',
};

export default function CSSOutlineAnimations({ onBack }: Props) {
  const [outlineState, setOutlineState] = useState<OutlineState>(initialState);
  const paletteTimeouts = useRef<Array<ReturnType<typeof setTimeout>>>([]);

  const toggleBorderColor = (key: BorderColorKeys, color: string) => {
    setOutlineState((prev) => ({
      ...prev,
      [key]: prev[key] === color ? initialState[key] : color,
    }));
  };

  const toggleOutlineColor = () => {
    setOutlineState((prev) => ({
      ...prev,
      outlineColor: prev.outlineColor === '#8e44ad' ? '#f39c12' : '#8e44ad',
    }));
  };

  const toggleOutlineWidth = () => {
    setOutlineState((prev) => ({
      ...prev,
      outlineWidth: prev.outlineWidth === 10 ? 0 : 10,
    }));
  };

  const toggleOutlineOffset = () => {
    setOutlineState((prev) => ({
      ...prev,
      outlineOffset: prev.outlineOffset === 10 ? 0 : 10,
    }));
  };

  const toggleOutlineStyle = () => {
    setOutlineState((prev) => ({
      ...prev,
      outlineStyle: prev.outlineStyle === 'solid' ? 'dashed' : 'solid',
    }));
  };

  const clearPaletteTimeouts = () => {
    paletteTimeouts.current.forEach(clearTimeout);
    paletteTimeouts.current = [];
  };

  const cycleBorderPalette = () => {
    clearPaletteTimeouts();
    const shades = ['#e74c3c', '#f1c40f', '#2ecc71', '#3498db'];
    const keys: BorderColorKeys[] = [
      'borderTopColor',
      'borderRightColor',
      'borderBottomColor',
      'borderLeftColor',
    ];

    shades.forEach((color, index) => {
      const timeoutId = setTimeout(() => {
        setOutlineState((prev) => ({
          ...prev,
          [keys[index]]: color,
        }));
      }, index * 250);
      paletteTimeouts.current.push(timeoutId);
    });
  };

  const resetAll = () => {
    clearPaletteTimeouts();
    setOutlineState(initialState);
  };

  useEffect(() => () => clearPaletteTimeouts(), []);

  // CSS transitions keep border/outline tweaks fluid on RN Web.
  const animatedStyle = {
    borderWidth: 8,
    borderStyle: 'solid',
    borderColor: outlineState.borderColor,
    borderTopColor: outlineState.borderTopColor,
    borderRightColor: outlineState.borderRightColor,
    borderBottomColor: outlineState.borderBottomColor,
    borderLeftColor: outlineState.borderLeftColor,
    outlineColor: outlineState.outlineColor,
    outlineWidth: outlineState.outlineWidth,
    outlineOffset: outlineState.outlineOffset,
    outlineStyle: outlineState.outlineStyle,
    boxShadow: '0 12px 25px rgba(0,0,0,0.25)',
    transitionProperty: [
      'borderColor',
      'borderTopColor',
      'borderRightColor',
      'borderBottomColor',
      'borderLeftColor',
      'outlineColor',
      'outlineWidth',
      'outlineOffset',
      'outlineStyle',
    ],
    transitionDuration: 350,
    transitionTimingFunction: 'ease-in-out',
  } as const;

  const buttons = [
    {
      title: 'All Borders',
      onPress: () => toggleBorderColor('borderColor', '#1abc9c'),
    },
    {
      title: 'Top Border',
      onPress: () => toggleBorderColor('borderTopColor', '#e74c3c'),
    },
    {
      title: 'Right Border',
      onPress: () => toggleBorderColor('borderRightColor', '#f1c40f'),
    },
    {
      title: 'Bottom Border',
      onPress: () => toggleBorderColor('borderBottomColor', '#2ecc71'),
    },
    {
      title: 'Left Border',
      onPress: () => toggleBorderColor('borderLeftColor', '#9b59b6'),
    },
    { title: 'Outline Color', onPress: toggleOutlineColor },
    { title: 'Outline Width', onPress: toggleOutlineWidth },
    { title: 'Outline Offset', onPress: toggleOutlineOffset },
    { title: 'Outline Style', onPress: toggleOutlineStyle },
    { title: 'Cycle Palette', onPress: cycleBorderPalette },
    { title: 'Reset All', onPress: resetAll },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.animationContainer}>
        <Animated.View style={[styles.card, animatedStyle]}>
          <Text style={styles.cardTitle}>CSS Outline Studio</Text>
          <Text style={styles.cardSubtitle}>
            Border colors + outline props via CSS transitions
          </Text>
        </Animated.View>
      </View>

      <ScrollView
        style={styles.buttonsContainer}
        showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Back to Home</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Border Color & Outline Lab</Text>
        <Text style={styles.subtitle}>
          Demonstrates `borderColor`, `outlineColor`, `outlineOffset`,
          `outlineStyle`, and `outlineWidth`.
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
    backgroundColor: '#0d1117',
  },
  animationContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 24,
  },
  card: {
    width: 260,
    height: 160,
    borderRadius: 18,
    backgroundColor: '#111b2b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ecf0f1',
    marginBottom: 6,
  },
  cardSubtitle: {
    color: '#95a5a6',
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 20,
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
    backgroundColor: '#2c3e50',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 10,
    width: '48%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#ecf0f1',
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
