import React, { useState } from 'react';
import { Button, StyleSheet, Text } from 'react-native';
import Animated, { SlideInRight, SlideOutLeft } from 'react-native-reanimated';

const digits = [...Array(10).keys()];

const cardMargin = 10;

export default function FlatListEntering() {
  return (
    <Animated.LayoutConfig config={true}>
      <List />
    </Animated.LayoutConfig>
  );
}

function List() {
  const [show, setShow] = useState(true);
  const [data, setData] = useState(digits);

  return (
    <>
      <Button onPress={() => setShow(!show)} title="toggle" />
      <Button
        title="add"
        onPress={() =>
          setData((data) => {
            return [...data, data.length];
          })
        }
      />
      <Button
        title="remove"
        onPress={() =>
          setData((data) => {
            data.pop();
            return [...data];
          })
        }
      />
      {show && (
        <Animated.FlatList
          style={styles.container}
          contentContainerStyle={[styles.contentContainer]}
          decelerationRate="fast"
          data={data}
          renderItem={({ item, index }) => <Item item={item} index={index} />}
        />
      )}
    </>
  );
}

function Item({ item }: { item: number; index: number }) {
  return (
    <Animated.View
      entering={SlideInRight.duration(500)}
      exiting={SlideOutLeft}
      style={styles.card}>
      <Text style={styles.text}>{item}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    margin: 10,
  },
  contentContainer: {
    alignItems: 'center',
  },
  card: {
    width: 330,
    height: 100,
    backgroundColor: 'white',
    borderRadius: 20,
    borderColor: '#eee',
    borderWidth: 1,
    margin: cardMargin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 32,
  },
});
