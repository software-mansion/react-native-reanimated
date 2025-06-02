import React, { useState } from 'react';
import { Button, ScrollView, StyleSheet, Text, View } from 'react-native';
import type Animated from 'react-native-reanimated';
import {
  useAnimatedReaction,
  useAnimatedRef,
  useScrollViewOffset,
} from 'react-native-reanimated';

export default function EmptyExample() {
  const [shouldRender, setShouldRender] = useState(false);
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollOffset = useScrollViewOffset(scrollRef);

  useAnimatedReaction(
    () => scrollOffset.value,
    (value) => {
      console.log('scrollOffset', value);
    }
  );

  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        ScrollView is {shouldRender ? 'rendered' : 'not rendered'}
      </Text>
      <Button
        title={shouldRender ? 'Remove ScrollView' : 'Render ScrollView'}
        onPress={() => setShouldRender(!shouldRender)}
      />

      {shouldRender && (
        <ScrollView
          ref={scrollRef}
          scrollEventThrottle={1000 / 60}
          style={styles.scrollView}>
          {Array.from({ length: 20 }).map((_, index) => (
            <View key={index} style={styles.item}>
              <Text style={styles.itemText}>Scroll Item {index + 1}</Text>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  text: {
    fontSize: 16,
    marginBottom: 10,
  },
  scrollView: {
    flex: 1,
    marginTop: 20,
  },
  item: {
    height: 100,
    backgroundColor: '#f0f0f0',
    marginVertical: 8,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemText: {
    fontSize: 16,
    color: '#333',
  },
});
