import React from 'react';
import { StyleSheet, View, Button } from 'react-native';
import {
  createWorkletRuntime,
  runOnRuntime,
  type WorkletRuntime,
} from 'react-native-worklets';
import axios from 'axios';

const mydloRuntime = createWorkletRuntime({
  name: 'mydlo',
});

const widloRuntime = createWorkletRuntime({
  name: 'widlo',
});

const powidloRuntime = createWorkletRuntime({
  name: 'powidlo',
});

function callback(runtime: WorkletRuntime) {
  'worklet';
  axios({
    method: 'get',
    url: 'https://tomekzaw.pl',
  })
    .then((response) => {
      console.log('Received response on', globalThis._LABEL);
      console.log(response.data);
    })
    .catch((error) => {
      console.error('Axios error:', error);
    });
  const nextRuntime =
    runtime.name === mydloRuntime.name
      ? widloRuntime
      : runtime.name === widloRuntime.name
        ? powidloRuntime
        : mydloRuntime;

  setTimeout(() => {
    runOnRuntime(nextRuntime, callback)(nextRuntime);
  }, 100);
}

export default function App() {
  return (
    <View style={styles.container}>
      <Button
        title="UNLEASH THE FETCH"
        onPress={() => {
          runOnRuntime(mydloRuntime, callback)(mydloRuntime);
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
