import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { runOnUI } from 'react-native-worklets';
import axios from 'axios';

export default function App() {
  runOnUI(() => {
    'worklet';
    axios({
      method: 'get',
      url: 'https://tomekzaw.pl',
    })
      .then((response) => {
        console.log('Received response');
        console.log(response.data);
      })
      .catch((error) => {
        console.error('Axios error:', error);
      });
  })();

  return (
    <View style={styles.container}>
      <Text>Hello world!</Text>
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
