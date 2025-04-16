import { useState, useEffect } from 'react';
import {
  Button,
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import {unsubscribeFromKeyboardEvents} from 'react-native-reanimated';

function measureKeyboardSubscriptionPerformance(
  numberOfListeners: number
): number {
  const start = performance.now();
  for (let i = 0; i < numberOfListeners; i++) {
    unsubscribeFromKeyboardEvents(i);
  }
  const end = performance.now();
  return end - start;
}

export default function UnsubscribeFromKeyboardEventsPerformanceTest() {
  const [time, setTime] = useState<number | null>(null);
  const [numberOfListeners, setNumberOfListeners] = useState<number>(100);

  const startTest = () => {
    setTime(measureKeyboardSubscriptionPerformance(numberOfListeners));
  };

  // Ensure listeners are cleaned up if the component unmounts during a test
  // (Though the test itself is synchronous and cleans up)
  useEffect(() => {
    return () => {
      // In a real app, you might manage listeners more persistently,
      // but for this sync test, cleanup happens within the measure function.
      // If the test involved async ops or stateful listeners, cleanup here would be crucial.
    };
  }, []);


  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        <Text style={styles.description}>
            This test measures the performance of unsubscribing from keyboard events.{'\n\n'}
            It unsubscribes from a specified number of listeners, measuring the time taken for
            unsubscription.{'\n\n'}
            Configure:{'\n'}• Number of listeners: How many listeners to unsubscribe from
            {'\n\n'}
        </Text>
        <View style={styles.textInputContainer}>
          <View style={styles.textInputRow}>
            <Text>Number of listeners</Text>
            <TextInput
              keyboardType="numeric"
              style={styles.textInput}
              placeholder="Number of listeners"
              value={numberOfListeners.toString()}
              onChangeText={(text) =>
                setNumberOfListeners(text ? parseInt(text) : 0)
              }
            />
          </View>
        </View>
        <Button title="Measure performance" onPress={startTest} />
        {time !== null && (
          <Text>Unsubscribing took {time.toFixed(2)} milliseconds</Text>
        )}
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    padding: 20, // Added padding for better layout
  },
  textInput: {
    borderWidth: 1,
    borderColor: 'gray',
    padding: 10,
    borderRadius: 5,
    width: 80,
    textAlign: 'right',
  },
  textInputContainer: {
    gap: 10,
    marginBottom: 10, // Added margin
  },
  textInputRow: {
    width: 250, // Adjusted width
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  description: {
    textAlign: 'center',
    paddingHorizontal: 20,
    marginBottom: 20, // Added margin
  },
});