'use strict';
import React, { useMemo, useState } from 'react';
import { Button, StyleSheet, Text } from 'react-native';
import Animated, {
  Easing,
  Layout,
  RotateInUpRight,
  RotateOutUpLeft,
  SlideInRight,
  SlideOutLeft,
} from 'react-native-reanimated';

const digits = [0, 1];

export default function ChangeThemeExample() {
  return <List />;
}

function List() {
  const [theme, setTheme] = useState(true);
  const [data, setData] = useState(digits);
  const [disabled, setDisabled] = useState(false);

  const layoutAnimations = useMemo(
    () =>
      disabled
        ? {
            entering: undefined,
            exiting: undefined,
            layout: undefined,
          }
        : theme
          ? {
              entering: RotateInUpRight,
              exiting: RotateOutUpLeft,
              layout: Layout.easing(Easing.exp).delay(200),
            }
          : {
              entering: SlideInRight,
              exiting: SlideOutLeft,
              layout: Layout.springify().delay(200),
            },
    [disabled, theme]
  );

  const backgroundColor = theme
    ? { backgroundColor: 'purple' }
    : { backgroundColor: 'pink' };

  return (
    <>
      <Text style={styles.text}>Current theme: {theme ? 1 : 2}</Text>
      <Button onPress={() => setTheme(!theme)} title="Toggle theme" />
      <Button
        title={(disabled ? 'enable' : 'disable') + ' layout animations'}
        onPress={() => setDisabled((disabled) => !disabled)}
      />
      <Button
        title="add"
        onPress={() =>
          setData((data) => {
            if (data.length === 0) {
              return [0];
            }
            return [...data, data[data.length - 1] + 1];
          })
        }
      />
      <Button
        title="remove"
        onPress={() =>
          setData((data) => {
            data.shift();
            return [...data];
          })
        }
      />
      <Animated.FlatList
        skipEnteringExitingAnimations
        itemLayoutAnimation={layoutAnimations.layout}
        style={styles.container}
        contentContainerStyle={[styles.contentContainer]}
        decelerationRate="fast"
        data={data}
        keyExtractor={(item) => item.toString()}
        renderItem={(item) => (
          <Animated.View
            entering={layoutAnimations.entering}
            exiting={layoutAnimations.exiting}
            style={[styles.card, backgroundColor]}>
            <Text style={styles.text}>{item.item}</Text>
          </Animated.View>
        )}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    margin: 10,
  },
  contentContainer: {
    alignItems: 'center',
    marginTop: 30,
    height: 1000,
  },
  card: {
    width: 330,
    height: 100,
    backgroundColor: 'white',
    borderRadius: 20,
    borderColor: '#eee',
    borderWidth: 1,
    margin: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  text: {
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 18,
    margin: 10,
  },
});
