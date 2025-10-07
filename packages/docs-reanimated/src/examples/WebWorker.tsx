import React, { useState, useEffect, useRef } from 'react';
import { View, Button, Text, StyleSheet } from 'react-native';
import { WebWorker } from '../../../react-native-worklets';

// Define the worklet function that will run in the worker thread
const workerScript = () => {
  'worklet';

  // This is the 'global' scope within the worker
  global.onmessage = (event) => {
    const { type, data } = event.data;

    if (type === 'ECHO') {
      // Send a message back to the main thread
      global.postMessage({ type: 'ECHO_RESPONSE', payload: `Worker received: ${data}` });
    } else if (type === 'TRIGGER_ERROR') {
      // Intentionally throw an error
      throw new Error('This is a simulated error from the worker!');
    }
  };
};

function WebWorkerExample() {
  const [message, setMessage] = useState<string>('No message yet');
  const [error, setError] = useState<string | null>(null);
  const workerRef = useRef<WebWorker<{ type: string; data?: any }, { type: string; payload: any }> | null>(null);

  useEffect(() => {
    // Create the worker instance when the component mounts
    const worker = new WebWorker('myWorker', workerScript);
    workerRef.current = worker;

    // Set up message handler
    worker.onmessage = (event) => {
      const { type, payload } = event.data;
      console.log('Message received from worker:', event.data);
      if (type === 'ECHO_RESPONSE') {
        setMessage(payload);
        setError(null); // Clear previous errors
      }
    };

    // Set up error handler
    worker.onerror = (event) => {
      console.error('Error received from worker:', event.data);
      setError(`Worker Error: ${event.data}`);
      setMessage('Error occurred'); // Update message state
    };

    // Clean up the worker when the component unmounts
    return () => {
      console.log('Terminating worker...');
      worker.terminate();
      workerRef.current = null;
    };
  }, []); // Empty dependency array ensures this runs only once

  const sendMessageToWorker = () => {
    if (workerRef.current) {
      const messageData = { type: 'ECHO', data: `Hello from main thread! ${Math.random().toFixed(2)}` };
      console.log('Sending message to worker:', messageData);
      workerRef.current.postMessage(messageData);
      setMessage('Message sent, waiting for response...');
      setError(null);
    }
  };

  const triggerWorkerError = () => {
    if (workerRef.current) {
      const errorData = { type: 'TRIGGER_ERROR' };
      console.log('Sending error trigger to worker:', errorData);
      workerRef.current.postMessage(errorData);
      setMessage('Triggering error in worker...');
      setError(null);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.status}>Worker Status:</Text>
      <Text style={styles.message}>{message}</Text>
      {error && <Text style={styles.error}>{error}</Text>}
      <View style={styles.buttonContainer}>
        <Button title="Send Message to Worker" onPress={sendMessageToWorker} />
      </View>
      <View style={styles.buttonContainer}>
        <Button title="Trigger Worker Error" onPress={triggerWorkerError} color="red" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  status: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  message: {
    fontSize: 16,
    marginBottom: 10,
    textAlign: 'center',
    color: 'blue',
  },
  error: {
    fontSize: 16,
    marginBottom: 10,
    textAlign: 'center',
    color: 'red',
    fontWeight: 'bold',
  },
  buttonContainer: {
    marginTop: 15,
    width: '80%',
  },
});

export default WebWorkerExample;





