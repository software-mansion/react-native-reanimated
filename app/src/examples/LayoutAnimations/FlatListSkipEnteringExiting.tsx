'use strict';
import React, { useState } from 'react';
import { Button, StyleSheet } from 'react-native';
import Animated, {
  FadeInUp,
  LayoutAnimationConfig,
  PinwheelIn,
  PinwheelOut,
  SlideInRight,
  SlideOutLeft,
} from 'react-native-reanimated';

const digits = [0, 1, 2];

export default function FlatListSkipEnteringExiting() {
  return <List />;
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
          skipEnteringExitingAnimations
          style={styles.container}
          contentContainerStyle={[styles.contentContainer]}
          decelerationRate="fast"
          data={data}
          renderItem={() => <Item />}
        />
      )}
    </>
  );
}

function Item() {
  return (
    <Animated.View
      entering={SlideInRight.duration(500)}
      exiting={SlideOutLeft}
      style={styles.card}>
      <Animated.View
        entering={FadeInUp.duration(1000).delay(500)}
        style={styles.outerBox}>
        <LayoutAnimationConfig skipEntering={false}>
          <Animated.View
            style={styles.box}
            entering={PinwheelIn.duration(2000)}
            exiting={PinwheelOut}
          />
        </LayoutAnimationConfig>
      </Animated.View>
      <Animated.View
        entering={FadeInUp.duration(1000).delay(500)}
        style={styles.outerBox}>
        <Animated.View
          style={styles.box}
          entering={PinwheelIn.duration(2000)}
          exiting={PinwheelOut}
        />
      </Animated.View>
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
    flexDirection: 'row',
  },
  outerBox: {
    width: 50,
    height: 50,
    backgroundColor: '#b58df1',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 80,
    borderRadius: 5,
  },
  box: {
    width: 30,
    height: 30,
    backgroundColor: '#782aeb',
  },
});
