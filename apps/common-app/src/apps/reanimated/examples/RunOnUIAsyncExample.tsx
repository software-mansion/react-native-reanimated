import React, { useCallback, useState } from 'react';
import { Button, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { interpolateColor, runOnJS } from 'react-native-reanimated';
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
    const sorted = [...currentCards].sort((a, b) => a.value - b.value);
    return sorted;
  };

  const shuffleCardsOnUIWorklet = (currentCards: Card[]): Card[] => {
    'worklet';
    const shuffled = [...currentCards];
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
            handleSortPress().catch(() => {});
          }}
          disabled={isSorting || isShuffling}
        />
        <Button
          title={isShuffling ? 'Shuffling...' : 'Shuffle Cards on UI Thread'}
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

export default RunOnUIAsyncExample;
