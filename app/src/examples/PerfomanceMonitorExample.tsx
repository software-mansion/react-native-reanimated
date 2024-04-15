import React, { useRef, useState } from 'react';
import { Text, StyleSheet, Pressable, View } from 'react-native';
import { PerformanceMonitor } from 'react-native-reanimated';

import EmptyExample from './EmptyExample';
import BokehExample from './BokehExample';
import PlanetsExample from './PlanetsExample';
import EmojiWaterfallExample from './EmojiWaterfallExample';

enum Examples {
  Empty = 'Empty Example',
  Bokeh = 'Bokeh Example',
  Planets = 'Planets Example',
  Emojis = 'Emoji Waterfall Example',
}

export default function PerformanceMonitorExample() {
  const exampleElements = useRef(
    new Map<Examples, JSX.Element>([
      [Examples.Empty, <EmptyExample />],
      [Examples.Bokeh, <BokehExample />],
      [Examples.Planets, <PlanetsExample />],
      [Examples.Emojis, <EmojiWaterfallExample />],
    ])
  );

  const [currentExample, setCurrentExample] = useState(Examples.Empty);

  return (
    <>
      <PerformanceMonitor />
      {exampleElements.current.get(currentExample)!}
      <View style={styles.buttonContainer}>
        {[
          Examples.Empty,
          Examples.Bokeh,
          Examples.Planets,
          Examples.Emojis,
        ].map((element) => (
          <Pressable
            key={element}
            style={styles.button}
            onPress={() => setCurrentExample(element)}>
            <Text>{element}</Text>
          </Pressable>
        ))}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  buttonContainer: {
    position: 'absolute',
    flex: 1,
    flexDirection: 'column',
    gap: 4,
    margin: 8,
    marginLeft: 200,
  },
  button: {
    backgroundColor: 'lightblue',
    padding: 8,
    borderRadius: 8,
    flex: 1,
    textAlign: 'center',
  },
});
