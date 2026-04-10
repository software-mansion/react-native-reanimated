import type React from 'react';
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

function Hint({ text }: { text: string | React.ReactNode }) {
  return <Text style={styles.hint}>{text}</Text>;
}

function FormFields({
  accentColor,
  accentBg,
}: {
  accentColor: string;
  accentBg: string;
}) {
  return (
    <>
      <AnimatedTextInput
        style={{
          ...styles.formInput,
          transitionDuration: '150ms',
          borderColor: { default: '#ddd', ':focus': accentColor },
          borderWidth: { default: 1, ':focus': 2 },
          backgroundColor: { default: '#fff', ':focus': accentBg },
        }}
        placeholder="Username - :focus"
        autoCapitalize="none"
      />

      <AnimatedTextInput
        style={{
          ...styles.formInput,
          transitionDuration: '150ms',
          borderColor: { default: '#ddd', ':focus': accentColor },
          borderWidth: { default: 1, ':focus': 2 },
          backgroundColor: { default: '#fff', ':focus': accentBg },
        }}
        placeholder="Password - :focus"
        secureTextEntry
      />

      <Animated.View
        style={{
          ...styles.nestedInputWrapper,
          transitionDuration: '150ms',
          borderColor: { default: '#ddd', ':focus-within': accentColor },
          borderWidth: { default: 1, ':focus-within': 2 },
          backgroundColor: { default: '#fff', ':focus-within': accentBg },
        }}>
        <Text style={styles.nestedInputLabel}>wrapper - :focus-within</Text>
        <AnimatedTextInput
          style={{
            ...styles.nestedInput,
            transitionDuration: '150ms',
            borderWidth: { default: 1, ':focus': 2 },
            borderColor: { default: '#ddd', ':focus': accentColor },
            backgroundColor: { default: '#fff', ':focus': accentBg },
          }}
          placeholder="Email (inside wrapper) - :focus"
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </Animated.View>

      <Animated.View
        style={{
          ...styles.nestedInputWrapper,
          transitionDuration: '150ms',
          borderColor: { default: '#ddd', ':focus-within': accentColor },
          borderWidth: { default: 1, ':focus-within': 2 },
          backgroundColor: { default: '#fff', ':focus-within': accentBg },
        }}>
        <Text style={styles.nestedInputLabel}>wrapper - :focus-within</Text>
        <View style={styles.nestedRow}>
          <AnimatedTextInput
            style={{
              ...styles.nestedInput,
              flex: 1,
              transitionDuration: '150ms',
              borderWidth: { default: 1, ':focus': 2 },
              borderColor: { default: '#ddd', ':focus': accentColor },
              backgroundColor: { default: '#fff', ':focus': accentBg },
            }}
            placeholder="City - :focus"
          />
          <AnimatedTextInput
            style={{
              ...styles.nestedInput,
              flex: 1,
              transitionDuration: '150ms',
              borderWidth: { default: 1, ':focus': 2 },
              borderColor: { default: '#ddd', ':focus': accentColor },
              backgroundColor: { default: '#fff', ':focus': accentBg },
            }}
            placeholder="ZIP - :focus"
            keyboardType="number-pad"
          />
        </View>
      </Animated.View>

      <AnimatedTextInput
        style={{
          ...styles.formTextArea,
          transitionDuration: '150ms',
          borderColor: { default: '#ddd', ':focus': accentColor },
          borderWidth: { default: 1, ':focus': 2 },
          backgroundColor: { default: '#fff', ':focus': accentBg },
        }}
        placeholder="Notes - :focus"
        multiline
        numberOfLines={3}
      />
    </>
  );
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

      <SectionHeader title=":focus vs :focus-within" />
      <Hint
        text={
          ':focus - fires only on the focused element itself.\n' +
          ':focus-within - fires when any descendant gains focus.\n\n' +
          'Both forms have the same fields inside. ' +
          'The outer card differs: :focus never activates (a View is not an input), ' +
          ':focus-within activates whenever any inner field is focused.'
        }
      />

      <Animated.View
        style={{
          ...styles.formCard,
          transitionDuration: '200ms',
          borderColor: { default: '#ddd', ':focus': '#e74c3c' },
          borderWidth: { default: 1.5, ':focus': 2.5 },
          backgroundColor: { default: '#fafafa', ':focus': '#fff5f5' },
        }}>
        <Text style={styles.formCardLabel}>
          outer card - :focus (never activates)
        </Text>
        <FormFields accentColor="#e74c3c" accentBg="#fff5f5" />
      </Animated.View>

      <Animated.View
        style={{
          ...styles.formCard,
          transitionDuration: '200ms',
          borderColor: { default: '#ddd', ':focus-within': '#6c63ff' },
          borderWidth: { default: 1.5, ':focus-within': 2.5 },
          backgroundColor: { default: '#fafafa', ':focus-within': '#f5f4ff' },
        }}>
        <Text style={styles.formCardLabel}>
          outer card - :focus-within (activates on any inner focus)
        </Text>
        <FormFields accentColor="#6c63ff" accentBg="#f0eeff" />
      </Animated.View>

      <View style={styles.bottomPadding} />
      <Text style={styles.footer}>
        All transitions run on the UI thread - no JS frames.
      </Text>
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
  formCard: {
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  formCardLabel: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#888',
    marginBottom: 2,
  },
  formInput: {
    height: 42,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 15,
  },
  formTextArea: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingTop: 10,
    fontSize: 15,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  nestedInputWrapper: {
    borderRadius: 8,
    padding: 10,
    gap: 6,
  },
  nestedInputLabel: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: '#aaa',
  },
  nestedInput: {
    height: 38,
    borderRadius: 6,
    paddingHorizontal: 8,
    fontSize: 15,
  },
  nestedRow: {
    flexDirection: 'row',
    gap: 10,
  },
  bottomPadding: {
    height: 10,
  },
  footer: {
    textAlign: 'center',
    fontSize: 12,
    color: '#aaa',
    fontFamily: 'monospace',
  },
});
