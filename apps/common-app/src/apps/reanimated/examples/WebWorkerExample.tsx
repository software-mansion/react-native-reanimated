import React, { useEffect, useState } from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';
import { myWorker, performHeavyComputation } from './WebWorker';

export default function WebWorkerExample() {
  const [counter, setCounter] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCounter((prevCounter) => prevCounter + 1);
    }, 1000); // Toggle every 3 seconds

    return () => clearInterval(interval);
  }, []);


  return (
    <View style={styles.marginTop}>
      <View style={styles.counterContainer}>  
        <Text>Counter on main thread: {counter}</Text>
      </View>

      <Button
        onPress={() => {
          myWorker.postMessage(counter.toString());
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
          myWorker.terminate();
        }}
        title="Terminate worker (finish current job and terminate)"
      />

      <Button
        onPress={() => {
          myWorker.postMessage('error');
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