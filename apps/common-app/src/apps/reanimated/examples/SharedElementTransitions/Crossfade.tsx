import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React, { createContext, useContext, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { SharedTransition } from 'react-native-reanimated';

import { withSharedTransitionBoundary } from './withSharedTransitionBoundary';

type StackParamList = {
  List: undefined;
  Details: { id: string };
};

type Item = {
  id: string;
  name: string;
  glyph: string;
  color: string;
  subtitle: string;
};

const ITEMS: Item[] = [
  {
    id: 'cupcake',
    name: 'Cupcake',
    glyph: '🧁',
    color: '#e05780',
    subtitle: 'Android 1.5',
  },
  {
    id: 'donut',
    name: 'Donut',
    glyph: '🍩',
    color: '#f08a24',
    subtitle: 'Android 1.6',
  },
  {
    id: 'eclair',
    name: 'Eclair',
    glyph: '🥖',
    color: '#1d9a8a',
    subtitle: 'Android 2.0',
  },
  {
    id: 'froyo',
    name: 'Froyo',
    glyph: '🍦',
    color: '#5a4fcf',
    subtitle: 'Android 2.2',
  },
];

const LOREM_IPSUM =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.';

const MODES = {
  default: SharedTransition.duration(600),
  crossfade: SharedTransition.duration(600).crossfade(),
  'short fade': SharedTransition.duration(600).crossfade({ end: 0.3 }),
  spring: SharedTransition.springify().crossfade({ end: 0.5 }),
};

type Mode = keyof typeof MODES;

const ModeContext = createContext<Mode>('crossfade');

const Stack = createNativeStackNavigator<StackParamList>();

function ListScreen({
  navigation,
  setMode,
}: NativeStackScreenProps<StackParamList, 'List'> & {
  setMode: (mode: Mode) => void;
}) {
  const mode = useContext(ModeContext);
  const transition = MODES[mode];
  return (
    <View style={styles.screen}>
      <View style={styles.modes}>
        {(Object.keys(MODES) as Mode[]).map((key) => (
          <Pressable
            key={key}
            onPress={() => setMode(key)}
            style={[styles.mode, key === mode && styles.selectedMode]}>
            <Text style={key === mode && styles.selectedModeText}>{key}</Text>
          </Pressable>
        ))}
      </View>
      {ITEMS.map((item) => (
        <Pressable
          key={item.id}
          onPress={() => navigation.navigate('Details', { id: item.id })}>
          <Animated.View
            sharedTransitionTag={`crossfade-card-${item.id}`}
            sharedTransitionStyle={transition}
            style={[styles.card, { backgroundColor: item.color }]}>
            <Animated.View
              sharedTransitionTag={`crossfade-glyph-${item.id}`}
              sharedTransitionStyle={transition}
              style={styles.smallGlyph}>
              <Text style={styles.smallGlyphText}>{item.glyph}</Text>
            </Animated.View>
            <View>
              <Text style={styles.cardTitle}>{item.name}</Text>
              <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
            </View>
          </Animated.View>
        </Pressable>
      ))}
    </View>
  );
}

function DetailsScreen({
  route,
  navigation,
}: NativeStackScreenProps<StackParamList, 'Details'>) {
  const mode = useContext(ModeContext);
  const transition = MODES[mode];
  const item = ITEMS.find(({ id }) => id === route.params.id) ?? ITEMS[0];
  return (
    <Pressable style={styles.screen} onPress={() => navigation.goBack()}>
      <Animated.View
        sharedTransitionTag={`crossfade-card-${item.id}`}
        sharedTransitionStyle={transition}
        style={[styles.header, { backgroundColor: item.color }]}>
        <Animated.View
          sharedTransitionTag={`crossfade-glyph-${item.id}`}
          sharedTransitionStyle={transition}
          style={styles.largeGlyph}>
          <Text style={styles.largeGlyphText}>{item.glyph}</Text>
        </Animated.View>
        <Text style={styles.headerTitle}>{item.name}</Text>
        <Text style={styles.headerSubtitle}>Tap anywhere to go back</Text>
      </Animated.View>
      <Text style={styles.body}>{LOREM_IPSUM}</Text>
    </Pressable>
  );
}

const List = withSharedTransitionBoundary(ListScreen);
const Details = withSharedTransitionBoundary(DetailsScreen);

export default function CrossfadeExample() {
  const [mode, setMode] = useState<Mode>('crossfade');
  return (
    <ModeContext.Provider value={mode}>
      <Stack.Navigator>
        <Stack.Screen name="List" options={{ title: 'Crossfade' }}>
          {(props) => <List {...props} setMode={setMode} />}
        </Stack.Screen>
        <Stack.Screen name="Details" component={Details} />
      </Stack.Navigator>
    </ModeContext.Provider>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 16,
  },
  modes: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
  },
  mode: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#eeeeee',
  },
  selectedMode: {
    backgroundColor: '#222222',
  },
  selectedModeText: {
    color: '#ffffff',
  },
  card: {
    height: 88,
    overflow: 'hidden',
    marginBottom: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  smallGlyph: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#ffffff55',
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallGlyphText: {
    fontSize: 28,
  },
  cardTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  cardSubtitle: {
    color: '#ffffffcc',
    fontSize: 14,
  },
  header: {
    height: 280,
    overflow: 'hidden',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  largeGlyph: {
    width: 120,
    height: 120,
    borderRadius: 28,
    backgroundColor: '#ffffff55',
    alignItems: 'center',
    justifyContent: 'center',
  },
  largeGlyphText: {
    fontSize: 64,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: '#ffffffcc',
    fontSize: 14,
  },
  body: {
    marginTop: 16,
    fontSize: 17,
    lineHeight: 24,
  },
});
