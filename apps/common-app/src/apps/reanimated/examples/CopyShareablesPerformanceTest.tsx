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

import { SelectListDropdown } from '@/apps/css/components/inputs';

function createRandomObject(numberOfKeys: number) {
  const obj: Record<string, number> = {};
  for (let i = 0; i < numberOfKeys; i++) {
    obj[`key${i}`] = Math.random();
  }
  return obj;
}

type ArrayType = 'string' | 'number' | 'object';

function copyShareablesPerformanceTest(
  numberOfObjects: number,
  numberOfKeys: number,
  arrayType: ArrayType
) {
  const obj = Array.from({ length: numberOfObjects }, () => {
    if (arrayType === 'string') {
      return Math.random().toString();
    } else if (arrayType === 'number') {
      return Math.random();
    } else {
      return createRandomObject(numberOfKeys);
    }
  });
  const start = performance.now();
  makeShareableCloneRecursive(obj);
  const end = performance.now();
  return end - start;
}

export default function CopyShareablesPerformanceTest() {
  const [numberOfTests, setNumberOfTests] = useState<number>(100);
  const [arrayType, setArrayType] = useState<ArrayType>('string');
  const [time, setTime] = useState<{
    min: number;
    max: number;
    average: number;
  } | null>(null);
  const [numberOfObjects, setNumberOfObjects] = useState<number>(1000);
  const [numberOfKeys, setNumberOfKeys] = useState<number>(1000);

  const startTest = () => {
    const times = [];
    for (let i = 0; i < numberOfTests; i++) {
      times.push(
        copyShareablesPerformanceTest(numberOfObjects, numberOfKeys, arrayType)
      );
    }
    setTime({
      min: Math.min(...times),
      max: Math.max(...times),
      average: times.reduce((a, b) => a + b, 0) / numberOfTests,
    });
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        <View style={styles.textInputRow}>
          <Text>Array type</Text>
          <SelectListDropdown
            options={[
              { label: 'String', value: 'string' },
              { label: 'Number', value: 'number' },
              { label: 'Object', value: 'object' },
            ]}
            selected={arrayType}
            onSelect={(value) => setArrayType(value as ArrayType)}
          />
        </View>
        <Text style={styles.description}>
          This test measures the performance of Reanimated's
          makeShareableCloneRecursive function.{'\n\n'}
          The test creates an array of type {arrayType} with random{' '}
          {arrayType === 'string' ? 'string' : 'numeric'} values and measures
          how long it takes to make them shareable. You can configure: {'\n'}
          <Text style={styles.description}>
            {'\n'}• Number of tests: Number of times the test is run, to get an
            average time{'\n'}
          </Text>
          <Text style={styles.description}>
            {'\n'}• Number of {arrayType}s: Total {arrayType}s in the array
            {'\n'}
          </Text>
          {arrayType === 'object' && (
            <Text style={styles.description}>
              {'\n'}• Number of keys: Key-value pairs per object{'\n\n'}
            </Text>
          )}
        </Text>
        <View style={styles.textInputContainer}>
          <View style={styles.textInputRow}>
            <Text>Number of tests</Text>
            <TextInput
              keyboardType="numeric"
              style={styles.textInput}
              placeholder="Number of tests"
              value={numberOfTests.toString()}
              onChangeText={(text) =>
                setNumberOfTests(text ? parseInt(text) : 0)
              }
            />
          </View>
          <View style={styles.textInputRow}>
            <Text>Number of {arrayType}s</Text>
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
          {arrayType === 'object' && (
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
          )}
        </View>
        <Button title="Measure performance" onPress={startTest} />
        {time && (
          <View>
            <Text>Average time: {time.average.toFixed(2)} milliseconds</Text>
            <Text>Min time: {time.min.toFixed(2)} milliseconds</Text>
            <Text>Max time: {time.max.toFixed(2)} milliseconds</Text>
          </View>
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
