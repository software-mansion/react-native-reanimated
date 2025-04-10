import React, { useState } from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';
import { ReanimatedView } from 'react-native-reanimated';

export default function EmptyExample() {
  const [color, setColor] = useState('red');
  return (
    <View style={styles.container}>
      <Text>Hello world!</Text>
      <ReanimatedView style={{width: 200, backgroundColor: 'green' }}>
        <Text>Reanimated View</Text>
        <View style={{width: 100, height: 100, backgroundColor: color }} />
        <View style={{width: 100, height: 100, backgroundColor: 'blue' }} />
        <View style={{width: 100, height: 100, backgroundColor: 'yellow' }} />
      </ReanimatedView>
      <Button title='Click' onPress={() => {
        setColor(color === 'red' ? 'olive' : 'red');
      }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
