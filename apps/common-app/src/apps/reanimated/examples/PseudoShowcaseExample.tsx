import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

const CARDS = [
  {
    title: 'Quick Actions',
    icon: '✦',
    color: '#0047FF',
    actions: [
      { label: 'Like', icon: '♡', doneIcon: '♥', color: '#0047FF' },
      { label: 'Star', icon: '☆', doneIcon: '★', color: '#0090FF' },
      { label: 'Collect', icon: '◇', doneIcon: '◆', color: '#00AAFF' },
    ],
  },
  {
    title: 'Share & Save',
    icon: '◈',
    color: '#001EA8',
    actions: [
      { label: 'Repost', icon: '↺', doneIcon: '↻', color: '#001EA8' },
      { label: 'Bookmark', icon: '⊡', doneIcon: '⊠', color: '#003DCC' },
      { label: 'Pin', icon: '◯', doneIcon: '●', color: '#0066DD' },
    ],
  },
  {
    title: 'Reactions',
    icon: '❋',
    color: '#0077CC',
    actions: [
      { label: 'Love', icon: '♡', doneIcon: '♥', color: '#002299' },
      { label: 'Wow', icon: '☆', doneIcon: '★', color: '#0055EE' },
      { label: 'Support', icon: '◇', doneIcon: '◆', color: '#0077CC' },
    ],
  },
];

function ActionButton() {
  return (
    <Animated.View
      onStartShouldSetResponder={() => true}
      onResponderRelease={onToggle}
      style={[
        styles.btn,
        {
          borderColor: {
            default: active ? color + 'ff' : '#e5e5e5ff',
            ':hover': color + 'ff',
          },
          backgroundColor: {
            default: '#fafafa00',
            ':hover': color + '06',
            ':active': color + '22',
          },
          shadowColor: color,
          shadowOpacity: { default: active ? 0.55 : 0, ':hover': 0.25 },
          transform: {
            default: [{ scale: 1 }],
            ':hover': [{ scale: 0.97 }],
            ':active': [{ scale: 0.95 }],
          },
          transitionDuration: '250ms',
          transitionTimingFunction: 'ease-in-out',
        },
      ]}>
      <Text style={[styles.btnText, { color: active ? color : '#555' }]}>
        {active ? doneIcon : icon}
        {'  '}
        {label}
      </Text>
    </Animated.View>
  );
}

function Card() {
  const [active, setActive] = useState(null);
  return (
    <Animated.View
      style={[
        styles.card,
        {
          height: { default: 72, ':hover': 256 },
          shadowOpacity: { default: 0.06, ':hover': 0.14 },
          transitionDuration: '300ms',
          transitionTimingFunction: 'ease-in-out',
        },
      ]}>
      <Text style={[styles.title, { color }]}>
        {icon}
        {'  '}
        {title}
      </Text>
      <View style={styles.actions}>
        {actions.map((a) => (
          <ActionButton
            key={a.label}
            {...a}
            active={active === a.label}
            onToggle={() => setActive(a.label)}
          />
        ))}
      </View>
    </Animated.View>
  );
}

export default function PseudoShowcaseExample() {
  return (
    <ScrollView style={styles.bg} contentContainerStyle={styles.screen}>
      {CARDS.map((c) => (
        <Card key={c.title} {...c} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  bg: { backgroundColor: '#f5f5f7' },
  screen: { padding: 28, paddingTop: 48, paddingBottom: 48, gap: 16 },
  card: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    padding: 20,
    gap: 16,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 20,
    elevation: 4,
  },
  title: { fontSize: 17, fontWeight: '700', color: '#111', lineHeight: 36 },
  actions: { gap: 10 },
  btn: {
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderWidth: 1,
    backgroundColor: '#fafafa',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 16,
    elevation: 4,
  },
  btnText: { fontSize: 15, fontWeight: '600' },
});
