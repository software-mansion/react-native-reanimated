import React, { useState } from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

export default function EmptyExample() {
  const [color, setColor] = useState('red');
  return (
    <View style={styles.container}>
      <Text>Hello world!</Text>
      <Animated.View style={{ backgroundColor: 'green', width: 200 }}>
        <Text>Reanimated View</Text>
        <View style={{ backgroundColor: color, height: 100, width: 100 }} />
        <View style={{ backgroundColor: 'blue', height: 100, width: 100 }} />
        <View style={{ backgroundColor: 'yellow', height: 100, width: 100 }} />
      </Animated.View>
      <Button
        title="Click"
        onPress={() => {
          setColor(color === 'red' ? 'olive' : 'red');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
});
