import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

const DURATION = 600;
const EASING = 'ease-out';

type Variant = { label: string; styleA: object; styleB: object };

const numericVariants: Variant[] = [
  {
    label: 'opacity 1 ↔ 0.2',
    styleA: { opacity: 1 },
    styleB: { opacity: 0.2 },
  },
  {
    label: 'borderWidth 0 ↔ 8',
    styleA: { borderWidth: 0, borderColor: '#0f172a' },
    styleB: { borderWidth: 8, borderColor: '#0f172a' },
  },
  {
    label: 'borderRadius 4 ↔ 32',
    styleA: { borderRadius: 4 },
    styleB: { borderRadius: 32 },
  },
];

const colorVariants: Variant[] = [
  {
    label: 'backgroundColor green ↔ pink',
    styleA: { backgroundColor: '#4ade80' },
    styleB: { backgroundColor: '#f472b6' },
  },
  {
    label: 'borderColor blue ↔ amber (with borderWidth)',
    styleA: { borderWidth: 6, borderColor: '#60a5fa' },
    styleB: { borderWidth: 6, borderColor: '#fbbf24' },
  },
  {
    label: 'backgroundColor with alpha 1 ↔ 0.3',
    styleA: { backgroundColor: 'rgba(34, 197, 94, 1)' },
    styleB: { backgroundColor: 'rgba(34, 197, 94, 0.3)' },
  },
];

const shadowVariants: Variant[] = [
  {
    label: 'shadowOpacity 0 ↔ 0.6',
    styleA: { ...shadowBase(), shadowOpacity: 0 },
    styleB: { ...shadowBase(), shadowOpacity: 0.6 },
  },
  {
    label: 'shadowRadius 0 ↔ 16',
    styleA: { ...shadowBase(), shadowRadius: 0 },
    styleB: { ...shadowBase(), shadowRadius: 16 },
  },
  {
    label: 'shadowColor cyan ↔ magenta',
    styleA: { ...shadowBase(), shadowColor: '#22d3ee' },
    styleB: { ...shadowBase(), shadowColor: '#e879f9' },
  },
  {
    label: 'shadowOffset (0, 0) ↔ (12, 12)',
    styleA: { ...shadowBase(), shadowOffset: { width: 0, height: 0 } },
    styleB: { ...shadowBase(), shadowOffset: { width: 12, height: 12 } },
  },
];

function shadowBase() {
  return {
    shadowColor: '#0f172a',
    shadowOpacity: 0.5,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  };
}

export default function EmptyExample() {
  const [toggled, setToggled] = useState(false);

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Section title="Numeric" variants={numericVariants} toggled={toggled} />
        <Section title="Color" variants={colorVariants} toggled={toggled} />
        <Section title="Shadow" variants={shadowVariants} toggled={toggled} />
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={styles.toggleButton}
          onPress={() => setToggled((t) => !t)}>
          <Text style={styles.toggleButtonText}>
            Toggle ({toggled ? 'B' : 'A'} → {toggled ? 'A' : 'B'})
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function Section({
  title,
  variants,
  toggled,
}: {
  title: string;
  variants: Variant[];
  toggled: boolean;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {variants.map((variant, i) => (
        <View key={i} style={styles.row}>
          <Animated.View
            style={[
              styles.box,
              {
                transitionProperty: 'all',
                transitionDuration: DURATION,
                transitionTimingFunction: EASING,
              },
              toggled ? variant.styleB : variant.styleA,
            ]}
          />
          <Text style={styles.label}>{variant.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 14,
  },
  box: {
    width: 64,
    height: 64,
    backgroundColor: '#94a3b8',
    borderRadius: 8,
  },
  label: {
    color: '#0f172a',
    fontSize: 13,
    flexShrink: 1,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    backgroundColor: '#f8fafc',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  toggleButton: {
    backgroundColor: '#0f172a',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  toggleButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});
