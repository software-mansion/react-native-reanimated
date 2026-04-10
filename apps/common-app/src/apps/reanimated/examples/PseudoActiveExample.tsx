import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

function BasicExample() {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Basic</Text>
      <Text style={styles.hint}>Press and hold</Text>
      <Animated.View
        style={{
          ...styles.box,
          transitionDuration: '180ms',
          transitionTimingFunction: 'ease-in-out',
          opacity: { default: 1, ':active': 0.6 },
          transform: {
            default: [{ scale: 1 }, { rotate: '0deg' }],
            ':active': [{ scale: 0.7 }, { rotate: '45deg' }],
          },
          backgroundColor: { default: '#4a90e2', ':active': '#e84393' },
        }}
      />
    </View>
  );
}

function ActiveCard() {
  return (
    <Animated.View
      style={{
        ...styles.nestedCard,
        transitionDuration: '150ms',
        backgroundColor: { default: '#e8f4fd', ':active': '#bdddf7' },
        borderColor: { default: '#90caf9', ':active': '#1565c0' },
      }}>
      <Text style={styles.layerLabel}>Layer 1 (card)</Text>

      <Animated.View
        style={{
          ...styles.nestedPanel,
          transitionDuration: '150ms',
          backgroundColor: { default: '#bbdefb', ':active': '#90caf9' },
          borderColor: { default: '#64b5f6', ':active': '#0d47a1' },
        }}>
        <Text style={styles.layerLabel}>Layer 2 (panel)</Text>

        <Animated.View
          style={{
            ...styles.nestedButton,
            transitionDuration: '120ms',
            backgroundColor: { default: '#1976d2', ':active': '#0d47a1' },
            transform: {
              default: [{ scale: 1 }],
              ':active': [{ scale: 0.9 }],
            },
          }}>
          <Text style={styles.nestedButtonText}>Layer 3 (button)</Text>
        </Animated.View>
      </Animated.View>
      <Text style={styles.cardHint}>Press button → all 3 layers activate</Text>
    </Animated.View>
  );
}

function ActiveDeepestCard() {
  return (
    <Animated.View
      style={{
        ...styles.nestedCard,
        transitionDuration: '150ms',
        backgroundColor: { default: '#fce8e8', ':active-deepest': '#f7bdbd' },
        borderColor: { default: '#f48fb1', ':active-deepest': '#b71c1c' },
      }}>
      <Text style={styles.layerLabel}>Layer 1 (card)</Text>

      {/* Layer 2 - inner panel */}
      <Animated.View
        style={{
          ...styles.nestedPanel,
          transitionDuration: '150ms',
          backgroundColor: {
            default: '#ffcdd2',
            ':active-deepest': '#ef9a9a',
          },
          borderColor: { default: '#e57373', ':active-deepest': '#c62828' },
        }}>
        <Text style={styles.layerLabel}>Layer 2 (panel)</Text>

        <Animated.View
          style={{
            ...styles.nestedButton,
            transitionDuration: '120ms',
            backgroundColor: {
              default: '#e53935',
              ':active-deepest': '#b71c1c',
            },
            transform: {
              default: [{ scale: 1 }],
              ':active-deepest': [{ scale: 0.9 }],
            },
          }}>
          <Text style={styles.nestedButtonText}>Layer 3 (button)</Text>
        </Animated.View>
      </Animated.View>
      <Text style={styles.cardHint}>Press button → only layer 3 activates</Text>
    </Animated.View>
  );
}

function MixedCard() {
  return (
    <Animated.View
      style={{
        ...styles.nestedCard,
        transitionDuration: '150ms',
        backgroundColor: { default: '#f3e5f5', ':active': '#ce93d8' },
        borderColor: { default: '#ce93d8', ':active': '#6a1b9a' },
      }}>
      <Text style={styles.layerLabel}>Layer 1 - :active</Text>

      <Animated.View
        style={{
          ...styles.nestedPanel,
          transitionDuration: '150ms',
          backgroundColor: {
            default: '#e1bee7',
            ':active-deepest': '#ba68c8',
          },
          borderColor: { default: '#ab47bc', ':active-deepest': '#4a148c' },
        }}>
        <Text style={styles.layerLabel}>Layer 2 - :active-deepest</Text>

        <Animated.View
          style={{
            ...styles.nestedButton,
            transitionDuration: '120ms',
            backgroundColor: {
              default: '#8e24aa',
              ':active-deepest': '#4a148c',
            },
            transform: {
              default: [{ scale: 1 }],
              ':active-deepest': [{ scale: 0.9 }],
            },
          }}>
          <Text style={styles.nestedButtonText}>Layer 3 - :active-deepest</Text>
        </Animated.View>
      </Animated.View>
      <Text style={styles.cardHint}>
        Press button → layer 1 + layer 3 activate; layer 2 stays idle
      </Text>
    </Animated.View>
  );
}

function TargetingExample() {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>:active vs :active-deepest</Text>
      <Text style={styles.hint}>
        Each card has 3 nested layers, all with the same selector.{'\n'}
        <Text style={styles.code}>:active</Text> - activates if button is
        pressed in the bounds of the component (propagates up through the
        descendants).{'\n'}
        <Text style={styles.code}>:active-deepest</Text> - it activates only if
        there is no other component with &apos:activate&apos or
        &apos:activate-deepest&apos in the way.
      </Text>

      <Text style={styles.cardGroupLabel}>:active</Text>
      <ActiveCard />

      <Text style={styles.cardGroupLabel}>:active-deepest</Text>
      <ActiveDeepestCard />

      <Text style={styles.sectionTitle}>Mixed</Text>
      <Text style={styles.hint}>
        Layer 1 uses <Text style={styles.code}>:active</Text>, layers 2–3 use{' '}
        <Text style={styles.code}>:active-deepest</Text>.{'\n'}
        Pressing the button: layer 1 activates (propagation) + layer 3 activates
        (deepest); layer 2 stays idle because layer 3 is a deeper{' '}
        <Text style={styles.code}>:active-deepest</Text>.
      </Text>
      <MixedCard />
    </View>
  );
}

export default function PseudoActiveExample() {
  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <BasicExample />
      <TargetingExample />
      <Text style={styles.footer}>
        All transitions run on the UI thread - no JS frames.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    padding: 20,
    gap: 32,
    paddingBottom: 48,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111',
  },
  hint: {
    fontSize: 13,
    color: '#666',
    lineHeight: 20,
  },
  code: {
    fontFamily: 'monospace',
    color: '#4a90e2',
  },
  box: {
    width: 150,
    height: 150,
    borderRadius: 16,
    alignSelf: 'center',
  },

  cardGroupLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#555',
    fontFamily: 'monospace',
    marginBottom: -4,
  },
  nestedCard: {
    borderRadius: 16,
    padding: 14,
    gap: 10,
    borderWidth: 2,
  },
  nestedPanel: {
    borderRadius: 12,
    padding: 12,
    gap: 10,
    borderWidth: 2,
  },
  nestedButton: {
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  nestedButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  layerLabel: {
    fontSize: 11,
    color: '#555',
    fontFamily: 'monospace',
  },
  cardHint: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  footer: {
    textAlign: 'center',
    fontSize: 12,
    color: '#aaa',
    fontFamily: 'monospace',
  },
});
