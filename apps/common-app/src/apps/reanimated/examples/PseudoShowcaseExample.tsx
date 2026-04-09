import React from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { createAnimatedComponent } from 'react-native-reanimated';

const AnimatedTextInput = createAnimatedComponent(TextInput);

function Snippet({ label, code }: { label?: string; code: string }) {
  const parts = code.split(/(:[a-z]+)/g);
  return (
    <View style={styles.snippet}>
      {label && <Text style={styles.snippetLabel}>{label}</Text>}
      <Text style={styles.snippetText}>
        {parts.map((part, i) =>
          part.startsWith(':') ? (
            <Text key={i} style={styles.snippetSelector}>
              {part}
            </Text>
          ) : (
            <Text key={i}>{part}</Text>
          )
        )}
      </Text>
    </View>
  );
}

const PADS = [
  { color: '#FF6B6B', emoji: '🔥' },
  { color: '#4ECDC4', emoji: '💧' },
  { color: '#FFE66D', emoji: '⚡' },
  { color: '#A8E063', emoji: '🌿' },
  { color: '#6C63FF', emoji: '🔮' },
  { color: '#F7971E', emoji: '🌊' },
  { color: '#FC5C7D', emoji: '🎯' },
  { color: '#43CEA2', emoji: '🚀' },
  { color: '#667EEA', emoji: '✨' },
];

function Pad({ color, emoji }: { color: string; emoji: string }) {
  return (
    <Animated.View
      style={{
        ...styles.pad,
        backgroundColor: { default: color, ':hover': '#fff' },
        transform: {
          default: [{ scale: 1 }],
          ':active': [{ scale: 0.82 }],
        },
        shadowOpacity: { default: 0.25, ':active': 0 },
        transitionDuration: '120ms',
        transitionTimingFunction: 'ease-out',
      }}>
      <Text style={styles.padEmoji}>{emoji}</Text>
    </Animated.View>
  );
}

function ActionButton({
  emoji,
  label,
  activeColor,
}: {
  emoji: string;
  label: string;
  activeColor: string;
}) {
  return (
    <Animated.View
      style={{
        ...styles.actionBtn,
        backgroundColor: {
          default: 'transparent',
          ':hover': `${activeColor}18`,
          ':active': `${activeColor}30`,
        },
        transform: {
          default: [{ scale: 1 }],
          ':active': [{ scale: 0.88 }],
        },
        transitionDuration: '100ms',
      }}>
      <Text style={styles.actionEmoji}>{emoji}</Text>
      <Text style={styles.actionLabel}>{label}</Text>
    </Animated.View>
  );
}

function SocialCard() {
  return (
    <Animated.View
      style={{
        ...styles.card,
        transform: {
          default: [{ scale: 1 }, { translateY: 0 }],
          ':hover': [{ scale: 1.01 }, { translateY: -3 }],
          ':active': [{ scale: 0.985 }, { translateY: 1 }],
        },
        shadowOpacity: { default: 0.08, ':hover': 0.18, ':active': 0.04 },
        transitionDuration: '150ms',
        transitionTimingFunction: 'ease-out',
      }}>
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>RN</Text>
        </View>
        <View>
          <Text style={styles.cardName}>React Native</Text>
          <Text style={styles.cardHandle}>@reactnative · just now</Text>
        </View>
      </View>
      <Text style={styles.cardBody}>
        Pseudo-selectors: CSS-style{' '}
        <Text style={styles.inlineCode}>:active</Text>,{' '}
        <Text style={styles.inlineCode}>:hover</Text> &{' '}
        <Text style={styles.inlineCode}>:focus</Text> — easy as on web. 🚀
      </Text>
      <View style={styles.actions}>
        <ActionButton emoji="❤️" label="Like" activeColor="#e74c3c" />
        <ActionButton emoji="💬" label="Reply" activeColor="#3498db" />
        <ActionButton emoji="🔁" label="Repost" activeColor="#2ecc71" />
        <ActionButton emoji="🔖" label="Save" activeColor="#f39c12" />
      </View>
    </Animated.View>
  );
}

function SearchBar() {
  return (
    <AnimatedTextInput
      style={{
        ...styles.searchBar,
        borderColor: { default: '#e0e0e0', ':focus': '#6C63FF' },
        borderWidth: { default: 1.5, ':focus': 2 },
        backgroundColor: {
          default: '#f8f8f8',
          ':focus': '#fff',
          ':hover': '#f0f0ff',
        },
        transform: {
          default: [{ scale: 1 }],
          ':active': [{ scale: 0.99 }],
        },
        transitionDuration: '150ms',
      }}
      placeholder="Search anything… (tap to see :focus)"
      placeholderTextColor="#aaa"
    />
  );
}

export default function PseudoShowcaseExample() {
  return (
    <ScrollView
      contentContainerStyle={styles.screen}
      keyboardShouldPersistTaps="handled">
      <Text style={styles.sectionTitle}>Launchpad</Text>
      <Snippet
        label="<Pad />"
        code={`backgroundColor: { default: color, ':active': '#fff' },\ntransform: {\n  default: [{ scale: 1 }],\n  ':active': [{ scale: 0.82 }],\n},\nshadowOpacity: { default: 0.25, ':active': 0 },`}
      />
      <View style={styles.grid}>
        {PADS.map((pad) => (
          <Pad key={pad.emoji} {...pad} />
        ))}
      </View>

      <Text style={styles.sectionTitle}>Card</Text>
      <Snippet
        label="<Card />"
        code={`transform: {\n  default: [{ scale: 1 }, { translateY: 0 }],\n  ':hover': [{ scale: 1.01 }, { translateY: -3 }],\n  ':active': [{ scale: 0.985 }, { translateY: 1 }],\n},\nshadowOpacity: { default: 0.08, ':hover': 0.18, ':active': 0.04 },`}
      />
      <Snippet
        label="<ActionButton />"
        code={`backgroundColor: {\n  default: 'transparent',\n  ':hover': activeColor + '18',\n  ':active': activeColor + '30',\n},\ntransform: {\n  default: [{ scale: 1 }],\n  ':active': [{ scale: 0.88 }],\n},`}
      />
      <SocialCard />

      <Text style={styles.sectionTitle}>Search</Text>
      <Snippet
        label="<AnimatedTextInput />"
        code={`borderColor: { default: '#e0e0e0', ':focus': '#6C63FF' },\nborderWidth: { default: 1.5, ':focus': 2 },\nbackgroundColor: {\n  default: '#f8f8f8',\n  ':focus': '#fff',\n  ':hover': '#f0f0ff',\n},`}
      />
      <SearchBar />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    padding: 20,
    gap: 10,
    paddingBottom: 48,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
    marginTop: 16,
  },

  snippet: {
    backgroundColor: '#1e1e2e',
    borderRadius: 10,
    padding: 12,
  },
  snippetLabel: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: '#6c7086',
    marginBottom: 6,
  },
  snippetText: {
    fontFamily: 'monospace',
    fontSize: 12,
    lineHeight: 19,
    color: '#cdd6f4',
  },
  snippetSelector: {
    color: '#cba6f7',
    fontWeight: '700',
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  pad: {
    width: 96,
    height: 96,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
  },
  padEmoji: {
    fontSize: 36,
  },

  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6C63FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  cardName: {
    fontWeight: '700',
    fontSize: 14,
    color: '#111',
  },
  cardHandle: {
    fontSize: 12,
    color: '#999',
  },
  cardBody: {
    fontSize: 14,
    color: '#333',
    lineHeight: 21,
  },
  inlineCode: {
    fontFamily: 'monospace',
    backgroundColor: '#f0f0f0',
    color: '#6C63FF',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionEmoji: {
    fontSize: 16,
  },
  actionLabel: {
    fontSize: 12,
    color: '#666',
  },

  searchBar: {
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 15,
  },
});
