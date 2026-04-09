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

function TargetingExample() {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Bottommost element wins</Text>
      <Text style={styles.hint}>
        Unlike on the web where <Text style={styles.code}>:active</Text>{' '}
        propagates to all ancestors, here only the deepest element with{' '}
        <Text style={styles.code}>:active</Text> gets activated.{'\n\n'}
        Press a button → only the button activates.{'\n'}
        Press the card background → only the card activates.
      </Text>

      <Animated.View
        style={{
          ...styles.card,
          backgroundColor: { default: '#fff', ':active': '#fff3cd' },
          transform: {
            default: [{ scale: 1 }],
            ':active': [{ scale: 0.97 }],
          },
          transitionDuration: '120ms',
        }}>
        <Text style={styles.cardLabel}>Card (has :active)</Text>
        <View style={styles.row}>
          <Animated.View
            style={{
              ...styles.pill,
              backgroundColor: { default: '#4a90e2', ':active': '#1a5fb4' },
              transform: {
                default: [{ scale: 1 }],
                ':active': [{ scale: 0.88 }],
              },
              transitionDuration: '100ms',
            }}>
            <Text style={styles.pillText}>Button A</Text>
          </Animated.View>
          <Animated.View
            style={{
              ...styles.pill,
              backgroundColor: { default: '#e74c3c', ':active': '#922b21' },
              transform: {
                default: [{ scale: 1 }],
                ':active': [{ scale: 0.88 }],
              },
              transitionDuration: '100ms',
            }}>
            <Text style={styles.pillText}>Button B</Text>
          </Animated.View>
        </View>
        <Text style={styles.cardHint}>← press here to activate card</Text>
      </Animated.View>
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

  card: {
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#e8e8e8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#999',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  pill: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 100,
  },
  pillText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  cardHint: {
    fontSize: 12,
    color: '#bbb',
    fontStyle: 'italic',
  },
  footer: {
    textAlign: 'center',
    fontSize: 12,
    color: '#aaa',
    fontFamily: 'monospace',
  },
});
