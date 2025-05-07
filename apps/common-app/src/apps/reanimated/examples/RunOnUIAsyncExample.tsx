import React, { useCallback, useState } from 'react';
import { Button, ScrollView, StyleSheet, Text, View } from 'react-native';
import { runOnJS } from 'react-native-reanimated';
import { runOnUIAsync } from 'react-native-worklets';

interface Card {
  id: string;
  value: number;
}

const NUM_COLUMNS = 10;
const NUM_ROWS = 18;
const TOTAL_CARDS = NUM_COLUMNS * NUM_ROWS;

const generateCards = (): Card[] => {
  return Array.from({ length: TOTAL_CARDS }, (_, i) => ({
    id: `card-${i}`,
    value: Math.floor(Math.random() * 1000), // Random value for sorting
  }));
};

const RunOnUIAsyncExample: React.FC = () => {
  const [cards, setCards] = useState<Card[]>(generateCards());
  const [isSorting, setIsSorting] = useState(false);
  const [isShuffling, setIsShuffling] = useState(false);

  const sortCardsOnUIWorklet = (currentCards: Card[]): Card[] => {
    'worklet';
    const startTime = performance.now();
    while (performance.now() - startTime < 1000) {
      // Simulate intensive work
    }
    const sorted = [...currentCards].sort((a, b) => a.value - b.value);
    return sorted;
  };

  const shuffleCardsOnUIWorklet = (currentCards: Card[]): Card[] => {
    'worklet';
    const shuffled = [...currentCards];
    const startTime = performance.now();
    while (performance.now() - startTime < 1000) {
      // Simulate intensive work
    }
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const handleSortPress = useCallback(async () => {
    setIsSorting(true);
    console.log('Starting sort on UI thread...');
    try {
      const sortedCards = await runOnUIAsync(sortCardsOnUIWorklet)(cards);
      setCards(sortedCards);
      setIsSorting(false);
      console.log('Sorting complete, state updated on UI thread.');
    } catch (e) {
      console.error('Failed to sort cards on UI thread:', e);
      runOnJS(setIsSorting)(false);
    }
  }, [cards]);

  const handleShufflePress = useCallback(async () => {
    setIsShuffling(true);
    console.log('Starting shuffle on UI thread...');
    try {
      const shuffledCards = await runOnUIAsync(shuffleCardsOnUIWorklet)(cards);
      setCards(shuffledCards);
      setIsShuffling(false);
      console.log('Shuffling complete, state updated on UI thread.');
    } catch (e) {
      console.error('Failed to shuffle cards on UI thread:', e);
      runOnJS(setIsShuffling)(false);
    }
  }, [cards]);

  return (
    <View style={styles.container}>
      <View style={styles.buttonContainer}>
        <Button
          title={isSorting ? 'Sorting...' : 'Sort Cards on UI Thread'}
          onPress={() => {
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            handleSortPress();
          }}
          disabled={isSorting || isShuffling}
        />
        <Button
          title={isShuffling ? 'Shuffling...' : 'Shuffle Cards on UI Thread'}
          onPress={() => {
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            handleShufflePress();
          }}
          disabled={isSorting || isShuffling}
        />
      </View>
      <ScrollView contentContainerStyle={styles.gridContainer}>
        {cards.map((card) => (
          <View key={card.id} style={styles.card}>
            <Text style={styles.cardText}>{card.value}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
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
    width: `${100 / NUM_COLUMNS - 2}%`, // Adjust for margin
    aspectRatio: 1, // Square cards
    backgroundColor: 'blue',
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

export default RunOnUIAsyncExample;
