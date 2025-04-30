import React, { useEffect, useState } from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';
import { WebWorker } from 'react-native-worklets';

export function performHeavyComputation() {
  console.log('Starting heavy computation');
  for (let i = 0; i < 500_000_000; i++) {
    Math.sqrt(i);
  }
  console.log('Done');
}

export default function WebWorkerExample() {
  const [counter, setCounter] = useState(0);
  const [myWorker, setMyWorker] = useState<WebWorker<string, Record<string, unknown>> | null>(null);
  
  useEffect(() => { 
    const myWorker = new WebWorker<string, Record<string, unknown>>(
      'Worker #1',
    () => {
      'worklet';
      let state = 0;

      onmessage = ({ data }: { data: string }) => {
        state = state + 1;
        console.log(`Worker started job ${state} with data: ${data}`);
        if (data === 'error') {
          throw new Error('Error from worker!!!');
        }
        console.log('Starting heavy computation');
        for (let i = 0; i < 500_000_000; i++) {
          Math.sqrt(i);
        }
        global.postMessage(`Done job ${state}`);
      };
      },
    );

    myWorker.onmessage = (e: { data: Record<string, unknown> }) => {
      console.log('JS received:', e.data);
    };

    myWorker.onerror = (e: { data: string }) => {
      console.error('JS received error:', e);
    };

    setMyWorker(myWorker);

    return () => {
      myWorker.terminate();
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCounter((prevCounter) => prevCounter + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <View style={styles.marginTop}>
      <View style={styles.counterContainer}>
        <Text>Counter on main thread: {counter}</Text>
      </View>

      <Button
        onPress={() => {
          myWorker?.postMessage(counter.toString());
        }}
        title="Send message to worker (run heavy computation on worker)"
      />

      <Button
        onPress={() => {
          performHeavyComputation();
        }}
        title="Perform heavy computation on main thread"
      />

      <Button
        onPress={() => {
          myWorker?.terminate();
        }}
        title="Terminate worker (finish current job and terminate)"
      />

      <Button
        onPress={() => {
          myWorker?.postMessage('error');
        }}
        title="Trigger error in worker"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  marginTop: {
    marginTop: 30,
  },
  height: {
    height: 400,
  },
  box: {
    margin: 20,
    padding: 5,
    borderWidth: 1,
    borderColor: 'black',
    width: 60,
    height: 60,
  },
  border: {
    borderWidth: 1,
  },
  counterContainer: {
    marginBottom: 20,
    padding: 10,
    borderWidth: 1,
    borderColor: 'black',
    flexDirection: 'row',
    justifyContent: 'center',
  },
});
