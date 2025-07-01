import { useState } from 'react';
import {
  Button,
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { makeShareableCloneRecursive } from 'react-native-reanimated';

function createRandomObject(numberOfKeys: number) {
  const obj: Record<string, number> = {};
  for (let i = 0; i < numberOfKeys; i++) {
    obj[`key${i}`] = Math.random();
  }
  return obj;
}

function copyShareablesPerformanceTest(
  numberOfObjects: number,
  numberOfKeys: number
) {
  const obj = Array.from({ length: numberOfObjects }, () =>
    createRandomObject(numberOfKeys)
  );
  const start = performance.now();
  makeShareableCloneRecursive(obj);
  const end = performance.now();
  return end - start;
}

export default function CopyShareablesPerformanceTest() {
  const [time, setTime] = useState<number | null>(null);
  const [numberOfObjects, setNumberOfObjects] = useState<number>(1000);
  const [numberOfKeys, setNumberOfKeys] = useState<number>(1000);

  const startTest = () => {
    setTime(copyShareablesPerformanceTest(numberOfObjects, numberOfKeys));
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        <Text style={styles.description}>
          This test measures the performance of Reanimated&apos;s
          makeShareableCloneRecursive function.{'\n\n'}
          The test creates an array of objects with random numeric values and
          measures how long it takes to make them shareable. You can configure:
          {'\n'}• Number of objects: Total objects in the array{'\n'}• Number of
          keys: Key-value pairs per object{'\n\n'}
        </Text>
        <View style={styles.textInputContainer}>
          <View style={styles.textInputRow}>
            <Text>Number of objects</Text>
            <TextInput
              keyboardType="numeric"
              style={styles.textInput}
              placeholder="Number of objects"
              value={numberOfObjects.toString()}
              onChangeText={(text) =>
                setNumberOfObjects(text ? parseInt(text) : 0)
              }
            />
          </View>
          <View style={styles.textInputRow}>
            <Text>Number of keys</Text>
            <TextInput
              keyboardType="numeric"
              style={styles.textInput}
              placeholder="Number of keys"
              value={numberOfKeys.toString()}
              onChangeText={(text) =>
                setNumberOfKeys(text ? parseInt(text) : 0)
              }
            />
          </View>
        </View>
        <Button title="Measure performance" onPress={startTest} />
        {time && <Text>Copying took {time.toFixed(2)} milliseconds</Text>}
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
  },
  textInput: {
    borderWidth: 1,
    borderColor: 'gray',
    padding: 10,
    borderRadius: 5,
    width: 80,
  },
  textInputContainer: {
    gap: 10,
  },
  textInputRow: {
    width: 220,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  description: {
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});
