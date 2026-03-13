import type React from 'react';
import { useCallback, useMemo, useState } from 'react';
import {
  Button,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import Animated, { interpolateColor } from 'react-native-reanimated';
import {
  createWorkletRuntime,
  runOnRuntimeAsync,
  runOnUIAsync,
  scheduleOnRN,
  type WorkletRuntime,
} from 'react-native-worklets';

interface Card {
  id: string;
  value: number;
}

type RuntimeType = 'ui' | 'worker';

const NUM_COLUMNS = 10;
const NUM_ROWS = 18;
const TOTAL_CARDS = NUM_COLUMNS * NUM_ROWS;

const generateCards = (): Card[] => {
  return Array.from({ length: TOTAL_CARDS }, (_, i) => ({
    id: `card-${i}`,
    value: Math.floor(Math.random() * 1000), // Random value for sorting
  }));
};

const sortCardsWorklet = (currentCards: Card[]): Card[] => {
  'worklet';
  const sorted = [...currentCards].sort((a, b) => a.value - b.value);
  return sorted;
};

const shuffleCardsWorklet = (currentCards: Card[]): Card[] => {
  'worklet';
  const shuffled = [...currentCards];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const RunOnAsyncExample: React.FC = () => {
  const [cards, setCards] = useState<Card[]>(generateCards());
  const [isSorting, setIsSorting] = useState(false);
  const [isShuffling, setIsShuffling] = useState(false);
  const [runtimeType, setRuntimeType] = useState<RuntimeType>('ui');

  // Create a worker runtime for background processing
  const workerRuntime: WorkletRuntime = useMemo(
    () => createWorkletRuntime({ name: 'CardSorterWorker' }),
    []
  );

  const getRuntimeLabel = useCallback(
    () => (runtimeType === 'ui' ? 'UI Runtime' : 'Worker Runtime'),
    [runtimeType]
  );

  const handleSortPress = useCallback(async () => {
    setIsSorting(true);
    console.log(`Starting sort on ${getRuntimeLabel()}...`);
    try {
      let sortedCards: Card[];
      if (runtimeType === 'ui') {
        sortedCards = await runOnUIAsync(sortCardsWorklet, cards);
      } else {
        sortedCards = await runOnRuntimeAsync(
          workerRuntime,
          sortCardsWorklet,
          cards
        );
      }
      setCards(sortedCards);
      setIsSorting(false);
      console.log(`Sorting complete on ${getRuntimeLabel()}.`);
    } catch (e) {
      console.error(`Failed to sort cards on ${getRuntimeLabel()}:`, e);
      scheduleOnRN(setIsSorting, false);
    }
  }, [cards, getRuntimeLabel, runtimeType, workerRuntime]);

  const handleShufflePress = useCallback(async () => {
    setIsShuffling(true);
    console.log(`Starting shuffle on ${getRuntimeLabel()}...`);
    try {
      let shuffledCards: Card[];
      if (runtimeType === 'ui') {
        shuffledCards = await runOnUIAsync(shuffleCardsWorklet, cards);
      } else {
        shuffledCards = await runOnRuntimeAsync(
          workerRuntime,
          shuffleCardsWorklet,
          cards
        );
      }
      setCards(shuffledCards);
      setIsShuffling(false);
      console.log(`Shuffling complete on ${getRuntimeLabel()}.`);
    } catch (e) {
      console.error(`Failed to shuffle cards on ${getRuntimeLabel()}:`, e);
      scheduleOnRN(setIsShuffling, false);
    }
  }, [cards, getRuntimeLabel, runtimeType, workerRuntime]);

  return (
    <View style={styles.container}>
      <View style={styles.runtimeSelector}>
        <Text style={styles.runtimeLabel}>UI Runtime</Text>
        <Switch
          value={runtimeType === 'worker'}
          onValueChange={(value) => setRuntimeType(value ? 'worker' : 'ui')}
        />
        <Text style={styles.runtimeLabel}>Worker Runtime</Text>
      </View>
      <Text style={styles.currentRuntime}>Current: {getRuntimeLabel()}</Text>
      <View style={styles.buttonContainer}>
        <Button
          title={isSorting ? 'Sorting...' : `Sort Cards`}
          onPress={() => {
            handleSortPress().catch(() => {});
          }}
          disabled={isSorting || isShuffling}
        />
        <Button
          title={isShuffling ? 'Shuffling...' : `Shuffle Cards`}
          onPress={() => {
            handleShufflePress().catch(() => {});
          }}
          disabled={isSorting || isShuffling}
        />
      </View>
      <ScrollView contentContainerStyle={styles.gridContainer}>
        {cards.map((card) => {
          const backgroundColor = interpolateColor(
            card.value,
            [0, 1000],
            ['#008000', '#000080'] // dark green to dark blue
          );
          return (
            <Animated.View
              key={card.id}
              style={[styles.card, { backgroundColor }]}>
              <Text style={styles.cardText}>{card.value}</Text>
            </Animated.View>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
  },
  runtimeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  runtimeLabel: {
    marginHorizontal: 10,
    fontSize: 14,
  },
  currentRuntime: {
    textAlign: 'center',
    marginBottom: 10,
    fontWeight: 'bold',
  },
  buttonContainer: {
    justifyContent: 'space-around',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 20,
  },
  card: {
    width: `${100 / NUM_COLUMNS - 2}%`,
    aspectRatio: 1,
    margin: '1%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 5,
  },
  cardText: {
    fontSize: 12,
    color: 'white',
  },
});

export default RunOnAsyncExample;
