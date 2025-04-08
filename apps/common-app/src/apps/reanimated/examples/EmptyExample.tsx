import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ReanimatedView } from 'react-native-reanimated';

export default function EmptyExample() {
  return (
    <View style={styles.container}>
      <Text>Hello world!</Text>
      <ReanimatedView style={{width: 200, height: 200, backgroundColor: 'green' }}>
        <Text>Reanimated View</Text>
      </ReanimatedView>
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
