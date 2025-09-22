import React from 'react';
import {
  Button,
  StyleSheet,
  Text,
  TurboModuleRegistry,
  View,
} from 'react-native';
import { createSerializable } from 'react-native-worklets';

export default function SerializableFreezingExample() {
  return (
    <View style={styles.container}>
      <View style={styles.textAndButton}>
        <Text style={styles.text}>⚠️</Text>
        <Button
          title="Modify converted array"
          onPress={tryModifyConvertedArray}
        />
      </View>
      <View style={styles.textAndButton}>
        <Text style={styles.text}>⚠️</Text>
        <Button
          title="Modify converted remote function"
          onPress={tryModifyConvertedRemoteFunction}
        />
      </View>
      <View style={styles.textAndButton}>
        <Text style={styles.text}>🤫</Text>
        <Button
          title="Modify converted host object"
          onPress={tryModifyConvertedHostObject}
        />
      </View>
      <View style={styles.textAndButton}>
        <Text style={styles.text}>⚠️</Text>
        <Button
          title="Modify converted plain object"
          onPress={tryModifyConvertedPlainObject}
        />
      </View>
      <View style={styles.textAndButton}>
        <Text style={styles.text}>🤫</Text>
        <Button
          title="Modify converted RegExp literal"
          onPress={tryModifyConvertedRegExpLiteral}
        />
      </View>
      <View style={styles.textAndButton}>
        <Text style={styles.text}>🤫</Text>
        <Button
          title="Modify converted RegExp instance"
          onPress={tryModifyConvertedRegExpInstance}
        />
      </View>
      <View style={styles.textAndButton}>
        <Text style={styles.text}>🤫</Text>
        <Button
          title="Modify converted ArrayBuffer"
          onPress={tryModifyConvertedArrayBuffer}
        />
      </View>
      <View style={styles.textAndButton}>
        <Text style={styles.text}>🤫</Text>
        <Button
          title="Modify converted Int32Array"
          onPress={tryModifyConvertedInt32Array}
        />
      </View>
      <View style={styles.textAndButton}>
        <Text style={styles.text}>🤫</Text>
        <Button
          title="Modify unconfigurable object"
          onPress={tryModifyUnconfigurableObject}
        />
      </View>
    </View>
  );
}

function tryModifyConvertedArray() {
  const obj = [1, 2, 3];
  createSerializable(obj);
  obj[0] = 2; // should warn because it's frozen
}

function tryModifyConvertedRemoteFunction() {
  const obj = () => {};
  obj.prop = 1;
  createSerializable(obj);
  obj.prop = 2; // should warn because it's frozen
}

function tryModifyConvertedHostObject() {
  const obj = TurboModuleRegistry.get('Clipboard');
  if (!obj) {
    console.warn('No host object found.');
    return;
  }
  createSerializable(obj);
  // @ts-ignore
  obj.prop = 2; // shouldn't warn because it's not frozen
}

function tryModifyConvertedPlainObject() {
  const obj = {
    prop: 1,
  };
  createSerializable(obj);
  obj.prop = 2; // should warn because it's frozen
}

function tryModifyConvertedRegExpLiteral() {
  const obj = /a/;
  createSerializable(obj);
  // @ts-ignore
  obj.prop = 2; // shouldn't warn because it's not frozen
}

function tryModifyConvertedRegExpInstance() {
  // eslint-disable-next-line prefer-regex-literals
  const obj = new RegExp('a');
  createSerializable(obj);
  // @ts-ignore
  obj.prop = 2; // shouldn't warn because it's not frozen
}

function tryModifyConvertedArrayBuffer() {
  const obj = new ArrayBuffer(8);
  createSerializable(obj);
  // @ts-ignore
  obj.prop = 2; // shouldn't warn because it's not frozen
}

function tryModifyConvertedInt32Array() {
  const obj = new Int32Array(2);
  createSerializable(obj);
  obj[1] = 2; // shouldn't warn because it's not frozen
}

function tryModifyUnconfigurableObject() {
  const obj = {};
  Object.defineProperty(obj, 'prop', {
    value: 1,
    writable: false,
    enumerable: true,
    configurable: false,
  });
  createSerializable(obj);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textAndButton: {
    width: '90%',
    flexDirection: 'row',
    alignItems: 'center',
  },
  text: {
    fontSize: 32,
    marginRight: 10,
  },
});
