import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

// Each row shows two boxes: ✅ same format (smooth) vs ❌ mixed format (jumps)
// Hold the box to trigger :active and observe the transition

const ROWS: {
  label: string;
  ok: { from: string; to: string };
  bad: { from: string; to: string };
}[] = [
  {
    label: '#rrggbb  vs  #rrggbb / rgba()',
    ok: { from: '#e8f0fe', to: '#1a73e8' },
    bad: { from: '#e8f0fe', to: 'rgba(26,115,232,1)' },
  },
  {
    label: '#rrggbbaa  vs  #rrggbbaa / #rrggbb',
    ok: { from: '#e8f0feff', to: '#1a73e8ff' },
    bad: { from: '#e8f0feff', to: '#1a73e8' },
  },
  {
    label: 'rgb()  vs  rgb() / #rrggbb',
    ok: { from: 'rgb(232,240,254)', to: 'rgb(26,115,232)' },
    bad: { from: 'rgb(232,240,254)', to: '#1a73e8' },
  },
  {
    label: 'rgba()  vs  rgba() / #rrggbbaa',
    ok: { from: 'rgba(232,240,254,1)', to: 'rgba(26,115,232,1)' },
    bad: { from: 'rgba(232,240,254,1)', to: '#1a73e8ff' },
  },
  {
    label: 'hsl()  vs  hsl() / #rrggbb',
    ok: { from: 'hsl(220,95%,94%)', to: 'hsl(214,82%,51%)' },
    bad: { from: 'hsl(220,95%,94%)', to: '#1a73e8' },
  },
  {
    label: '#rrggbbaa alpha  vs  same-rgb / diff-rgb',
    ok: { from: '#1a73e800', to: '#1a73e8ff' },
    bad: { from: '#e8f0fe00', to: '#1a73e8ff' },
  },
  {
    label: 'transparent keyword  vs  #rrggbbaa',
    ok: { from: '#1a73e800', to: '#1a73e8ff' },
    bad: { from: 'transparent', to: '#1a73e8ff' },
  },
];

function ColorBox({ from, to, ok }: { from: string; to: string; ok: boolean }) {
  return (
    <Animated.View
      style={[
        styles.box,
        {
          backgroundColor: {
            default: from,
            ':hover': to,
          },
          transitionDuration: '400ms',
          transitionTimingFunction: 'ease-in-out',
        },
      ]}>
      <Text style={styles.tag}>{ok ? '✅ smooth' : '❌ jumps'}</Text>
      <Text style={styles.colorLabel} numberOfLines={1}>
        {from}
      </Text>
      <Text style={styles.arrow}>↓ :hover</Text>
      <Text style={styles.colorLabel} numberOfLines={1}>
        {to}
      </Text>
    </Animated.View>
  );
}

export default function PseudoColorFormatsExample() {
  return (
    <ScrollView style={styles.bg} contentContainerStyle={styles.screen}>
      <Text style={styles.hint}>
        Hover over each box. Left = same format (smooth). Right = mixed format
        (jumps instantly).
      </Text>
      {ROWS.map((row, i) => (
        <View key={i} style={styles.row}>
          <Text style={styles.rowLabel}>{row.label}</Text>
          <View style={styles.pair}>
            <ColorBox {...row.ok} ok />
            <ColorBox {...row.bad} ok={false} />
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  bg: { backgroundColor: '#f5f5f7' },
  screen: { padding: 20, paddingTop: 40, paddingBottom: 48, gap: 20 },
  hint: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
    marginBottom: 4,
  },
  row: { gap: 6 },
  rowLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#888',
    fontFamily: 'monospace',
  },
  pair: { flexDirection: 'row', gap: 10 },
  box: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: '#0001',
    minHeight: 110,
    justifyContent: 'center',
  },
  tag: { fontSize: 12, fontWeight: '700' },
  colorLabel: {
    fontSize: 10,
    color: '#333',
    fontFamily: 'monospace',
  },
  arrow: { fontSize: 11, color: '#555' },
});
