import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { createAnimatedComponent } from 'react-native-reanimated';

const AnimatedTextInput = createAnimatedComponent(TextInput);
const AnimatedPressable = createAnimatedComponent(Pressable);

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

function Hint({ text }: { text: string }) {
  return <Text style={styles.hint}>{text}</Text>;
}

export default function PseudoFocusExample() {
  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled">
      <SectionHeader title="Basic text inputs" />
      <Hint text="Tap each field - border and opacity should animate" />

      <AnimatedTextInput
        style={{
          ...styles.input,
          transitionDuration: '200ms',
          borderColor: { default: '#ccc', ':focus': '#4a90e2' },
          borderWidth: { default: 1.5, ':focus': 3 },
          opacity: { default: 0.6, ':focus': 1 },
        }}
        placeholder="Username"
        autoCapitalize="none"
      />
      <AnimatedTextInput
        style={{
          ...styles.input,
          transitionDuration: '200ms',
          borderColor: { default: '#ccc', ':focus': '#e74c3c' },
          borderWidth: { default: 1.5, ':focus': 3 },
          opacity: { default: 0.6, ':focus': 1 },
        }}
        placeholder="Password"
        secureTextEntry
      />
      <AnimatedTextInput
        style={{
          ...styles.input,
          transitionDuration: '200ms',
          borderColor: { default: '#ccc', ':focus': '#2ecc71' },
          borderWidth: { default: 1.5, ':focus': 3 },
          opacity: { default: 0.6, ':focus': 1 },
        }}
        placeholder="Email"
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <SectionHeader title="Multiline TextInput" />
      <Hint text="Multiline uses UITextView internally" />

      <AnimatedTextInput
        style={{
          ...styles.textArea,
          transitionDuration: '200ms',
          borderColor: { default: '#ccc', ':focus': '#9b59b6' },
          borderWidth: { default: 1.5, ':focus': 3 },
          backgroundColor: { default: '#f9f9f9', ':focus': '#fdf6ff' },
        }}
        placeholder="Write something..."
        multiline
        numberOfLines={4}
      />

      {/* ── Switching quickly ── */}
      <SectionHeader title="Rapid switching" />
      <Hint text="Tap quickly between fields - only one should be focused at a time" />

      <View style={styles.row}>
        {['A', 'B', 'C'].map((label) => (
          <AnimatedTextInput
            key={label}
            style={{
              ...styles.inputSmall,
              transitionDuration: '100ms',
              borderColor: { default: '#ccc', ':focus': '#f39c12' },
              borderWidth: { default: 1.5, ':focus': 3 },
              transform: {
                default: [{ scale: 1 }],
                ':focus': [{ scale: 1.05 }],
              },
            }}
            placeholder={label}
          />
        ))}
      </View>

      <SectionHeader title="Non-editable (edge case)" />
      <Hint text="editable=false - should never receive focus" />

      <AnimatedTextInput
        style={{
          ...styles.input,
          transitionDuration: '200ms',
          borderColor: { default: '#ccc', ':focus': '#e74c3c' },
          borderWidth: { default: 1.5, ':focus': 3 },
          opacity: { default: 0.4, ':focus': 1 },
        }}
        placeholder="Read only"
        editable={false}
      />

      {/* ── Pressable edge case ── */}
      <SectionHeader title="Pressable (edge case)" />
      <Hint text=":focus won't fire - Pressable is not a text input, no UITextField/UITextView underneath" />

      <AnimatedPressable
        style={{
          ...styles.button,
          transitionDuration: '200ms',
          borderColor: { default: '#ccc', ':focus': '#4a90e2' },
          borderWidth: { default: 1.5, ':focus': 3 },
          backgroundColor: { default: '#f0f0f0', ':focus': '#d0e8ff' },
        }}>
        <Text style={styles.buttonText}>I won&apos;t respond to :focus</Text>
      </AnimatedPressable>

      {/* ── Nested input inside wrapper ── */}
      <SectionHeader title="Nested input (edge case)" />
      <Hint text=":focus on the wrapper Animated.View - tests isDescendantOfView logic" />

      <Animated.View
        style={{
          ...styles.wrapper,
          transitionDuration: '200ms',
          borderColor: { default: '#ccc', ':focus': '#1abc9c' },
          borderWidth: { default: 1.5, ':focus': 3 },
          backgroundColor: { default: '#f9f9f9', ':focus': '#eafaf1' },
        }}>
        <TextInput style={styles.inputInner} placeholder="Inside a wrapper" />
      </Animated.View>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#222',
    marginTop: 16,
  },
  hint: {
    fontSize: 12,
    color: '#888',
    lineHeight: 18,
  },
  input: {
    height: 48,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 16,
  },
  inputSmall: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    paddingHorizontal: 10,
    fontSize: 16,
    textAlign: 'center',
  },
  textArea: {
    height: 100,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingTop: 12,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 15,
    color: '#444',
  },
  wrapper: {
    borderRadius: 10,
    padding: 10,
  },
  inputInner: {
    height: 44,
    paddingHorizontal: 10,
    fontSize: 16,
    outlineWidth: 0,
  },
  bottomPadding: {
    height: 40,
  },
});
