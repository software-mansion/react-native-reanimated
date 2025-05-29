import { FlashList } from '@shopify/flash-list';
import React from 'react';
import { FlatList, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  useAnimatedReaction,
  useAnimatedRef,
  useScrollOffset,
} from 'react-native-reanimated';

const COLORS = [
  '#FF6B6B', // Coral Red
  '#4ECDC4', // Turquoise
  '#45B7D1', // Sky Blue
  '#96CEB4', // Sage Green
  '#FFEEAD', // Cream
  '#D4A5A5', // Dusty Rose
  '#9B59B6', // Purple
  '#3498DB', // Blue
  '#E67E22', // Orange
  '#2ECC71', // Emerald
];

function ColorItem({ color }: { color: string }) {
  return (
    <View style={[styles.colorItem, { backgroundColor: color }]}>
      <Text style={styles.colorText}>{color}</Text>
    </View>
  );
}

function ScrollViewExample() {
  const aref = useAnimatedRef<ScrollView>();
  const offset = useScrollOffset(aref);

  useAnimatedReaction(
    () => offset.value,
    (value) => {
      console.log('ScrollView offset', value);
    }
  );

  return (
    <ScrollView ref={aref} style={styles.listContainer}>
      {COLORS.map((color, index) => (
        <ColorItem color={color} key={index} />
      ))}
    </ScrollView>
  );
}

function FlatListExample() {
  const aref = useAnimatedRef<FlatList<string>>();
  const offset = useScrollOffset(aref);

  useAnimatedReaction(
    () => offset.value,
    (value) => {
      console.log('FlatList offset', value);
    }
  );
  return (
    <FlatList
      ref={aref}
      data={COLORS}
      keyExtractor={(_, index) => index.toString()}
      renderItem={({ item }) => <ColorItem color={item} />}
      style={styles.listContainer}
    />
  );
}

function FlashListExample() {
  const aref = useAnimatedRef<FlashList<string>>();
  const offset = useScrollOffset(aref);

  useAnimatedReaction(
    () => offset.value,
    (value) => {
      console.log('FlashList offset', value);
    }
  );
  return (
    <FlashList
      ref={aref}
      data={COLORS}
      estimatedItemSize={100}
      keyExtractor={(_, index) => index.toString()}
      renderItem={({ item }) => <ColorItem color={item} />}
      style={styles.listContainer}
    />
  );
}

export default function EmptyExample() {
  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.title}>ScrollView</Text>
        <ScrollViewExample />
      </View>
      <View style={styles.section}>
        <Text style={styles.title}>FlatList</Text>
        <FlatListExample />
      </View>
      <View style={styles.section}>
        <Text style={styles.title}>FlashList</Text>
        <FlashListExample />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    flexBasis: '30%',
  },
  colorItem: {
    alignItems: 'center',
    borderRadius: 8,
    elevation: 5,
    height: 100,
    justifyContent: 'center',
    marginVertical: 4,
    shadowColor: '#000',
    shadowOffset: {
      height: 2,
      width: 0,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  colorText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { height: 1, width: -1 },
    textShadowRadius: 10,
  },
  container: {
    backgroundColor: '#fff',
    flex: 1,
    padding: 16,
  },
  listContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginVertical: 8,
  },
});
