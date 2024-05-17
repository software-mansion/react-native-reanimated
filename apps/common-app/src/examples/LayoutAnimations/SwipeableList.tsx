import Animated, { Layout, ZoomOut } from 'react-native-reanimated';
import { Button, StyleSheet, Text, View } from 'react-native';
import React, { useState } from 'react';

const FRUITS = ['banana', 'strawberry', 'apple', 'kiwi', 'orange', 'blueberry'];

export default function SwipeableList() {
  const [fruits, setFruits] = useState(FRUITS);
  return (
    <View>
      <View>
        {fruits.map((value) => {
          return (
            <Animated.View
              layout={Layout.delay(300)}
              exiting={ZoomOut}
              key={value}
              style={[
                Styles.item,
                { backgroundColor: value === 'kiwi' ? 'green' : 'yellow' },
              ]}>
              <Text> {value} </Text>
              <Button
                title="remove"
                onPress={() => {
                  setFruits(fruits.filter((i) => i !== value));
                }}
              />
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

const Styles = StyleSheet.create({
  item: {
    height: 50,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: 'black',
    flexDirection: 'row',
  },
});
