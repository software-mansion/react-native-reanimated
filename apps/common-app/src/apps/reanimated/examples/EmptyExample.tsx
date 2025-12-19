import React, { useState } from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';
import { scheduleOnRN, scheduleOnUI } from 'react-native-worklets';

export default function EmptyExample() {
  const [text, setText] = useState('Empty Example');
  return (
    <View style={styles.container}>
      <Button
        title="Fetch on UI"
        onPress={() => {
          scheduleOnUI(() => {
            'worklet';
            const id = Math.round(Math.random() * 100).toString();
            fetch('https://jsonplaceholder.typicode.com/todos/' + id)
              .then((response) => response.json())
              .then((json) => {
                console.log('Fetched data on UI thread:', json);
                scheduleOnRN(setText, JSON.stringify(json));
              })
              .catch((error) => {
                console.error('Error fetching data on UI thread:', error);
              });
          });
        }}
      />
      <Text>{text}</Text>
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
