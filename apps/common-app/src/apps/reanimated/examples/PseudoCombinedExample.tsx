import React from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { createAnimatedComponent } from 'react-native-reanimated';

const AnimatedTextInput = createAnimatedComponent(TextInput);

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

function Hint({ text }: { text: string }) {
  return <Text style={styles.hint}>{text}</Text>;
}

function Label({ text }: { text: string }) {
  return <Text style={styles.label}>{text}</Text>;
}

function DifferentPropsSingleView() {
  return (
    <View style={styles.card}>
      <Label text=":active → scale  |  :hover → background" />
      <Animated.View
        style={{
          ...styles.box,
          backgroundColor: { default: '#4a90e2', ':hover': '#1a5fb4' },
          transform: {
            default: [{ scale: 1 }],
            ':active': [{ scale: 0.82 }],
          },
          transitionDuration: '120ms',
        }}
      />
      <Hint text="Press to scale. Hover (trackpad/mouse) to darken." />
    </View>
  );
}

function DifferentPropsTwoSelectors() {
  return (
    <View style={styles.card}>
      <Label text=":active → opacity  |  :hover → borderRadius" />
      <Animated.View
        style={{
          ...styles.box,
          backgroundColor: '#e74c3c',
          opacity: { default: 1, ':active': 0.4 },
          borderRadius: { default: 12, ':hover': 48 },
          transitionDuration: '150ms',
        }}
      />
      <Hint text="Press for opacity. Hover for pill shape." />
    </View>
  );
}

function DifferentPropsWithFocus() {
  return (
    <View style={styles.card}>
      <Label text=":active → opacity  |  :focus → border" />
      <AnimatedTextInput
        style={{
          ...styles.input,
          opacity: { default: 1, ':active': 0.6 },
          borderColor: { default: '#ccc', ':focus': '#4a90e2' },
          borderWidth: { default: 1, ':focus': 2 },
          transitionDuration: '150ms',
        }}
        placeholder="Tap to focus, press to dim"
        placeholderTextColor="#999"
      />
      <Hint text="Tap to see focus border. Long-press to dim." />
    </View>
  );
}

function AllThreeDifferentProps() {
  return (
    <View style={styles.card}>
      <Label text=":active → scale  |  :hover → bg  |  :focus → border" />
      <AnimatedTextInput
        style={{
          ...styles.input,
          backgroundColor: { default: '#fff', ':hover': '#eef4ff' },
          borderColor: { default: '#ccc', ':focus': '#4a90e2' },
          borderWidth: { default: 1, ':focus': 2 },
          transform: {
            default: [{ scale: 1 }],
            ':active': [{ scale: 0.97 }],
          },
          transitionDuration: '120ms',
        }}
        placeholder="All three selectors on different props"
        placeholderTextColor="#999"
      />
      <Hint text="Each selector touches a different prop — they compose freely." />
    </View>
  );
}

function SamePropTwoSelectors() {
  return (
    <View style={styles.card}>
      <Label text=":active and :hover both control opacity" />
      <Animated.View
        style={{
          ...styles.box,
          backgroundColor: '#9b59b6',
          opacity: { default: 1, ':active': 0.3, ':hover': 0.65 },
          transitionDuration: '150ms',
        }}
      />
      <Hint text="Active: 0.3 · Hover: 0.65 · Default: 1.0" />
    </View>
  );
}

function SamePropTwoSelectorsBackground() {
  return (
    <View style={styles.card}>
      <Label text=":active and :hover both control backgroundColor" />
      <Animated.View
        style={{
          ...styles.box,
          backgroundColor: {
            default: '#2ecc71',
            ':active': '#c0392b',
            ':hover': '#f39c12',
          },
          transitionDuration: '150ms',
        }}
      />
      <Hint text="Active: red · Hover: orange · Default: green" />
    </View>
  );
}

function SamePropAllThreeSelectors() {
  return (
    <View style={styles.card}>
      <Label text="All three selectors control backgroundColor" />
      <AnimatedTextInput
        style={{
          ...styles.input,
          backgroundColor: {
            default: '#fff',
            ':active': '#fde8e8',
            ':hover': '#e8f4fd',
            ':focus': '#e8fde8',
          },
          borderColor: '#ccc',
          borderWidth: 1,
          transitionDuration: '150ms',
        }}
        placeholder="Active: pink · Hover: blue · Focus: green"
        placeholderTextColor="#999"
      />
      <Hint text="Each selector sets a different background. Last fired wins." />
    </View>
  );
}

function SamePropMixedPriority() {
  return (
    <View style={styles.card}>
      <Label text=":active and :focus share opacity, :focus also owns borderColor" />
      <AnimatedTextInput
        style={{
          ...styles.input,
          opacity: { default: 1, ':active': 0.5, ':focus': 0.85 },
          borderColor: { default: '#ccc', ':focus': '#4a90e2' },
          borderWidth: 1,
          transitionDuration: '150ms',
        }}
        placeholder="Tap to focus, press to dim"
        placeholderTextColor="#999"
      />
      <Hint text="Opacity: active=0.5, focus=0.85. Border: focus only." />
    </View>
  );
}

export default function PseudoCombinedExample() {
  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled">
      <SectionHeader title="Different selectors → different props" />
      <Hint text="Each selector controls an independent set of properties." />
      <DifferentPropsSingleView />
      <DifferentPropsTwoSelectors />
      <DifferentPropsWithFocus />
      <AllThreeDifferentProps />

      <SectionHeader title="Different selectors → same prop" />
      <Hint text="Multiple selectors compete for the same property. Last fired wins." />
      <SamePropTwoSelectors />
      <SamePropTwoSelectorsBackground />
      <SamePropAllThreeSelectors />
      <SamePropMixedPriority />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 8,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111',
    marginTop: 16,
    marginBottom: 4,
  },
  card: {
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#e8e8e8',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#444',
    fontFamily: 'monospace',
  },
  hint: {
    fontSize: 12,
    color: '#888',
  },
  box: {
    width: 100,
    height: 100,
    borderRadius: 12,
    alignSelf: 'center',
  },
  input: {
    height: 44,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    backgroundColor: '#fff',
  },
});
