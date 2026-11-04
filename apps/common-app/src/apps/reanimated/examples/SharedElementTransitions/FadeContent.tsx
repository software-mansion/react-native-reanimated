import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React, { createContext, useContext, useState } from 'react';
import type { ImageSourcePropType } from 'react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeInDown,
  SharedTransition,
} from 'react-native-reanimated';

import duskCover from './assets/fade-content/coverDusk.png';
import leafIcon from './assets/fade-content/leaf.png';
import moonIcon from './assets/fade-content/moon.png';
import sunIcon from './assets/fade-content/sun.png';
import waveIcon from './assets/fade-content/wave.png';
import { withSharedTransitionBoundary } from './withSharedTransitionBoundary';

type StackParamList = {
  Home: undefined;
  Details: { id: string };
  Player: undefined;
  Chips: undefined;
};

type Item = {
  id: string;
  name: string;
  subtitle: string;
  color: string;
  icon: ImageSourcePropType;
};

const ITEMS: Item[] = [
  {
    id: 'sun',
    name: 'Sun',
    subtitle: 'Clear sky all day',
    color: '#f08a24',
    icon: sunIcon,
  },
  {
    id: 'moon',
    name: 'Moon',
    subtitle: 'A calm night',
    color: '#3b3f8f',
    icon: moonIcon,
  },
  {
    id: 'leaf',
    name: 'Leaf',
    subtitle: 'Spring in the park',
    color: '#1f8a5b',
    icon: leafIcon,
  },
  {
    id: 'wave',
    name: 'Wave',
    subtitle: 'A day at the sea',
    color: '#1b6fd1',
    icon: waveIcon,
  },
];

const LOREM_IPSUM =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.';

// Images and other views that are the same on both screens have their own tag and the plain transition.
const MODES = {
  default: {
    container: SharedTransition.duration(600),
    own: SharedTransition.duration(600),
  },
  'fade content': {
    container: SharedTransition.duration(600).fadeContent(),
    own: SharedTransition.duration(600),
  },
  spring: {
    container: SharedTransition.springify().fadeContent(),
    own: SharedTransition.springify(),
  },
  'quick fades': {
    container: SharedTransition.duration(600).fadeContent({
      fadeOut: { end: 0.4 },
      fadeIn: { duration: 150 },
    }),
    own: SharedTransition.duration(600),
  },
};

type Mode = keyof typeof MODES;

// With fadeContent, it plays when the moving view lands, instead of the fade-in.
const TITLE_ENTERING = FadeInDown.duration(400);

const SCENARIOS = ['list', 'player', 'same child'] as const;

type Scenario = (typeof SCENARIOS)[number];

const ModeContext = createContext<Mode>('fade content');

const Stack = createNativeStackNavigator<StackParamList>();

function useTransitions() {
  return MODES[useContext(ModeContext)];
}

function HomeScreen({
  navigation,
  setMode,
}: NativeStackScreenProps<StackParamList, 'Home'> & {
  setMode: (mode: Mode) => void;
}) {
  const mode = useContext(ModeContext);
  const [scenario, setScenario] = useState<Scenario>('list');
  return (
    <View style={styles.screen}>
      <Options options={SCENARIOS} selected={scenario} onSelect={setScenario} />
      <Options
        options={Object.keys(MODES) as Mode[]}
        selected={mode}
        onSelect={setMode}
      />
      {scenario === 'list' && (
        <ItemList onPress={(id) => navigation.navigate('Details', { id })} />
      )}
      {scenario === 'player' && (
        <MiniPlayer onPress={() => navigation.navigate('Player')} />
      )}
      {scenario === 'same child' && (
        <ChipCard onPress={() => navigation.navigate('Chips')} />
      )}
    </View>
  );
}

function Options<T extends string>({
  options,
  selected,
  onSelect,
}: {
  options: readonly T[];
  selected: T;
  onSelect: (option: T) => void;
}) {
  return (
    <View style={styles.options}>
      {options.map((option) => (
        <Pressable
          key={option}
          onPress={() => onSelect(option)}
          style={[styles.option, option === selected && styles.selectedOption]}>
          <Text style={option === selected && styles.selectedOptionText}>
            {option}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function ItemList({ onPress }: { onPress: (id: string) => void }) {
  const transitions = useTransitions();
  return ITEMS.map((item) => (
    <Pressable key={item.id} onPress={() => onPress(item.id)}>
      <Animated.View
        sharedTransitionTag={`fade-content-card-${item.id}`}
        sharedTransitionStyle={transitions.container}
        style={[styles.card, { backgroundColor: item.color }]}>
        <Animated.Image
          source={item.icon}
          sharedTransitionTag={`fade-content-icon-${item.id}`}
          sharedTransitionStyle={transitions.own}
          style={styles.smallIcon}
        />
        <View>
          <Text style={styles.cardTitle}>{item.name}</Text>
          <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
        </View>
      </Animated.View>
    </Pressable>
  ));
}

function DetailsScreen({
  route,
  navigation,
}: NativeStackScreenProps<StackParamList, 'Details'>) {
  const transitions = useTransitions();
  const item = ITEMS.find(({ id }) => id === route.params.id) ?? ITEMS[0];
  return (
    <Pressable style={styles.screen} onPress={() => navigation.goBack()}>
      <Animated.View
        sharedTransitionTag={`fade-content-card-${item.id}`}
        sharedTransitionStyle={transitions.container}
        style={[styles.header, { backgroundColor: item.color }]}>
        <Animated.Image
          source={item.icon}
          sharedTransitionTag={`fade-content-icon-${item.id}`}
          sharedTransitionStyle={transitions.own}
          style={styles.largeIcon}
        />
        <Animated.Text entering={TITLE_ENTERING} style={styles.headerTitle}>
          {item.name}
        </Animated.Text>
        <Text style={styles.headerSubtitle}>Tap anywhere to go back</Text>
      </Animated.View>
      <Text style={styles.body}>{LOREM_IPSUM}</Text>
    </Pressable>
  );
}

function MiniPlayer({ onPress }: { onPress: () => void }) {
  const transitions = useTransitions();
  return (
    <View style={styles.library}>
      <Text style={styles.libraryText}>Tap the player at the bottom.</Text>
      <Pressable onPress={onPress}>
        <Animated.View
          sharedTransitionTag="fade-content-player"
          sharedTransitionStyle={transitions.container}
          style={styles.miniPlayer}>
          <Animated.Image
            source={duskCover}
            sharedTransitionTag="fade-content-cover"
            sharedTransitionStyle={transitions.own}
            style={styles.smallCover}
          />
          <View style={styles.miniPlayerText}>
            <Text style={styles.songTitle}>Dusk</Text>
            <Text style={styles.songArtist}>The Animators</Text>
          </View>
          <Text style={styles.miniPlayerButton}>▶</Text>
        </Animated.View>
      </Pressable>
    </View>
  );
}

function PlayerScreen({
  navigation,
}: NativeStackScreenProps<StackParamList, 'Player'>) {
  const transitions = useTransitions();
  return (
    <Pressable style={styles.screen} onPress={() => navigation.goBack()}>
      <Animated.View
        sharedTransitionTag="fade-content-player"
        sharedTransitionStyle={transitions.container}
        style={styles.fullPlayer}>
        <Animated.Image
          source={duskCover}
          sharedTransitionTag="fade-content-cover"
          sharedTransitionStyle={transitions.own}
          style={styles.largeCover}
        />
        <Animated.Text entering={TITLE_ENTERING} style={styles.playerTitle}>
          Dusk
        </Animated.Text>
        <Text style={styles.playerArtist}>The Animators</Text>
        <View style={styles.progress}>
          <View style={styles.progressDone} />
        </View>
        <View style={styles.controls}>
          <Text style={styles.control}>⏮</Text>
          <Text style={styles.playControl}>⏸</Text>
          <Text style={styles.control}>⏭</Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

// Both chips are the same on both screens and are direct children of the card.
// Only the chip with its own tag does not fade.
function Chips() {
  const transitions = useTransitions();
  return (
    <>
      <View style={styles.chip}>
        <Text style={styles.chipText}>no tag</Text>
      </View>
      <Animated.View
        sharedTransitionTag="fade-content-chip"
        sharedTransitionStyle={transitions.own}
        style={styles.chip}>
        <Text style={styles.chipText}>own tag</Text>
      </Animated.View>
    </>
  );
}

function ChipCard({ onPress }: { onPress: () => void }) {
  const transitions = useTransitions();
  return (
    <Pressable onPress={onPress}>
      <Animated.View
        sharedTransitionTag="fade-content-chip-card"
        sharedTransitionStyle={transitions.container}
        style={styles.chipCard}>
        <Chips />
        <Text style={[styles.cardTitle, styles.fullWidth]}>Two chips</Text>
      </Animated.View>
    </Pressable>
  );
}

function ChipsScreen({
  navigation,
}: NativeStackScreenProps<StackParamList, 'Chips'>) {
  const transitions = useTransitions();
  return (
    <Pressable style={styles.screen} onPress={() => navigation.goBack()}>
      <Animated.View
        sharedTransitionTag="fade-content-chip-card"
        sharedTransitionStyle={transitions.container}
        style={[styles.chipCard, styles.chipHeader]}>
        <Chips />
        <Text style={[styles.headerTitle, styles.fullWidth]}>Two chips</Text>
        <Text style={[styles.headerSubtitle, styles.fullWidth]}>
          The chip without a tag fades out and in
        </Text>
      </Animated.View>
    </Pressable>
  );
}

const Home = withSharedTransitionBoundary(HomeScreen);
const Details = withSharedTransitionBoundary(DetailsScreen);
const Player = withSharedTransitionBoundary(PlayerScreen);
const ChipsDetails = withSharedTransitionBoundary(ChipsScreen);

export default function FadeContentExample() {
  const [mode, setMode] = useState<Mode>('fade content');
  return (
    <ModeContext.Provider value={mode}>
      <Stack.Navigator>
        <Stack.Screen name="Home" options={{ title: 'Fade content' }}>
          {(props) => <Home {...props} setMode={setMode} />}
        </Stack.Screen>
        <Stack.Screen name="Details" component={Details} />
        <Stack.Screen name="Player" component={Player} />
        <Stack.Screen
          name="Chips"
          component={ChipsDetails}
          options={{ title: 'Same child' }}
        />
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
  options: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 8,
  },
  option: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#eeeeee',
  },
  selectedOption: {
    backgroundColor: '#222222',
  },
  selectedOptionText: {
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
  smallIcon: {
    width: 56,
    height: 56,
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
    height: 300,
    overflow: 'hidden',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  largeIcon: {
    width: 140,
    height: 140,
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
  library: {
    flex: 1,
    justifyContent: 'space-between',
  },
  libraryText: {
    color: '#666666',
    fontSize: 15,
  },
  miniPlayer: {
    height: 72,
    overflow: 'hidden',
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#2d2a3e',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  smallCover: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  miniPlayerText: {
    flex: 1,
  },
  songTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  songArtist: {
    color: '#ffffffaa',
    fontSize: 13,
  },
  miniPlayerButton: {
    color: '#ffffff',
    fontSize: 24,
  },
  fullPlayer: {
    flex: 1,
    overflow: 'hidden',
    padding: 24,
    borderRadius: 32,
    backgroundColor: '#2d2a3e',
    alignItems: 'center',
  },
  largeCover: {
    width: 280,
    height: 280,
    marginTop: 24,
    borderRadius: 24,
  },
  playerTitle: {
    marginTop: 32,
    color: '#ffffff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  playerArtist: {
    marginTop: 4,
    color: '#ffffffaa',
    fontSize: 17,
  },
  progress: {
    alignSelf: 'stretch',
    height: 4,
    marginTop: 32,
    borderRadius: 2,
    backgroundColor: '#ffffff33',
  },
  progressDone: {
    width: '40%',
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ffffff',
  },
  controls: {
    marginTop: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 40,
  },
  control: {
    color: '#ffffff',
    fontSize: 32,
  },
  playControl: {
    color: '#ffffff',
    fontSize: 48,
  },
  chipCard: {
    height: 120,
    overflow: 'hidden',
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#845ec2',
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignContent: 'flex-start',
    gap: 12,
  },
  chipHeader: {
    height: 300,
    borderRadius: 24,
  },
  fullWidth: {
    width: '100%',
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#ffffff',
  },
  chipText: {
    color: '#845ec2',
    fontWeight: 'bold',
  },
});
