import { Button, StyleSheet, View } from 'react-native';
import { runOnUI, useSharedValue } from 'react-native-reanimated';
import React from 'react';

export default function LogExample() {
  useSharedValue(42); // force Reanimated initialization
  const testHostObject = global.__blobCollectorProvider; // TODO: find some host object
  // TODO: assert(testHostObject !== undefined);

  const handlePress = () => {
    function test(value: any, expected: string) {
      'worklet';
      const actual = _stringify(value);
      _log(actual);
      if (actual !== expected) {
        throw new Error(`Test failed, expected "${expected}", "got ${actual}"`);
      }
    }

    runOnUI(() => {
      'worklet';
      _log('==============================================');
      test(42, '42');
      test(3.14, '3.14');
      test(NaN, 'NaN');
      test(Infinity, 'Infinity');
      test(true, 'true');
      test(false, 'false');
      test(null, 'null');
      test(undefined, 'undefined');
      test('foo', 'foo');
      test(Symbol('foo'), 'Symbol(foo)');
      test(123456n, '123456n'); // TODO: change to BigInt after including it in babel plugin
      test({}, '{}');
      test({ foo: 'foo' }, "{ foo: 'foo' }");
      test(
        { foo: 'foo', bar: 'bar', baz: 'baz' },
        "{ foo: 'foo', bar: 'bar', baz: 'baz' }"
      );
      test([], '[]');
      test([1], '[1]');
      test([1, 2, 3], '[1,2,3]');
      test(() => {}, '[Function anonymous]');
      test(function () {}, '[Function anonymous]');
      test(function foo() {}, '[Function foo]');
      // test(eval, 'null');
      test(Object, '{}');
      test(Math, '[Math]');
      test(_log, '?'); // TODO: Set proper values for examples below after handling cyclic objects and updating babel plugin
      test(testHostObject, '[jsi::HostObject(HostObjectClassName)]');
      {
        let a = {};
        a.foo = a;
        test(a, '');
      }
      {
        let b = [];
        b.push(b);
        test(b, '');
      }
      test(global, '');
      test(new Map(), '');
      {
        const map = new Map();
        map.set('foo', 'foo');
        map.set('bar', 'bar');
        map.set('baz', 'baz');
        test(map, '');
      }
      test(new Set(), '');
      {
        const set = new Set();
        set.add(1);
        set.add(2);
        set.add(3);
        test(set, '');
      }
      test(new ArrayBuffer(42), 'null');
      test(new DataView(new ArrayBuffer(42)), 'null');
      test(new Promise(() => {}), 'null');
      test(new Uint8Array(), 'null');
      test(new Int32Array(), 'null');
      test(new Date(), 'null');
      test(String('foo'), 'null');
      test(new RegExp('foo'), 'null');
      test(new Error('foo'), 'null');
      test(new WeakMap(), 'null');
      test(new WeakSet(), 'null');
      _log('Tests passed'); // TODO: Cleanup tests after fixing all
      console.log('Tests passed');
    })();
  };

  return (
    <View style={styles.container}>
      <Button title="Run tests" onPress={handlePress} />
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
