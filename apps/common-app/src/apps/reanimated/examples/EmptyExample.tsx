import React from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';
import { scheduleOnUI } from 'react-native-worklets';

export default function EmptyExample() {
  return (
    <View style={styles.container}>
      <Button
        title="Fetch on UI"
        onPress={() => {
          scheduleOnUI(() => {
            'worklet';
            fetch('https://jsonplaceholder.typicode.com/todos/1')
              .then((response) => response.json())
              .then((json) => {
                console.log('Fetched data on UI thread:', json);
              })
              .catch((error) => {
                console.error('Error fetching data on UI thread:', error);
              });
          });
        }}
      />
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
