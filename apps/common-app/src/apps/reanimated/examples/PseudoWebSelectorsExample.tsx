import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { createAnimatedComponent } from 'react-native-reanimated';

// Web-only example: CSS pseudo-selectors that have no native mobile equivalent.
// On web, any unrecognized selector is passed through as a native CSS pseudo-selector -
// the browser handles the state automatically, no JS needed.

const AnimatedTextInput = createAnimatedComponent(TextInput);

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

function Hint({ text }: { text: string }) {
  return <Text style={styles.hint}>{text}</Text>;
}

export default function PseudoWebSelectorsExample() {
  const [value, setValue] = useState('');
  const [readOnlyValue, setReadOnlyValue] = useState('Try editing me...');
  const [readOnly, setReadOnly] = useState(true);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <SectionHeader title=":placeholder-shown" />
      <Hint text="Background is grey while the field is empty (placeholder visible). Turns blue once you start typing." />

      <AnimatedTextInput
        style={
          {
            ...styles.input,
            transitionDuration: '200ms',
            borderColor: { default: '#0077ff', ':placeholder-shown': '#ccc' },
            borderWidth: { default: 2, ':placeholder-shown': 1 },
            backgroundColor: {
              default: '#0077ff',
              ':placeholder-shown': '#fafafa',
            },
          } as any
        }
        placeholder="Start typing..."
        value={value}
        onChangeText={setValue}
      />

      <SectionHeader title=":read-only" />
      <Hint text="Toggle the switch to see the animation." />

      <View style={styles.row}>
        <Text style={styles.label}>Read-only</Text>
        <Switch value={readOnly} onValueChange={setReadOnly} />
      </View>

      <AnimatedTextInput
        style={
          {
            ...styles.input,
            transitionDuration: '200ms',
            borderColor: { default: '#ccc', ':read-only': '#f0a500' },
            borderWidth: { default: 1, ':read-only': 2 },
            backgroundColor: { default: '#fff', ':read-only': '#fffbf0' },
          } as any
        }
        value={readOnlyValue}
        onChangeText={setReadOnlyValue}
        editable={!readOnly}
      />

      <SectionHeader title=":valid / :invalid" />
      <Hint text="Browsers validate input[type=email] natively. The border reflects validity as you type." />

      <AnimatedTextInput
        style={
          {
            ...styles.input,
            transitionDuration: '200ms',
            borderColor: {
              default: '#ccc',
              ':valid': '#28a745',
              ':invalid': '#dc3545',
            },
            borderWidth: { default: 1, ':valid': 2, ':invalid': 2 },
          } as any
        }
        placeholder="Enter an email address"
        keyboardType="email-address"
        autoCapitalize="none"
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#222',
    marginTop: 16,
    fontFamily: 'monospace',
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
    fontSize: 15,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  label: {
    fontSize: 14,
    color: '#444',
  },
});
