import { Button, StyleSheet, Text, View } from 'react-native';
import { runOnUI, useSharedValue } from 'react-native-reanimated';
import React from 'react';

export default function LogExample() {
  useSharedValue(42); // force Reanimated initialization
  // const testHostObject = global.__reanimatedModuleProxy; // TODO: find simpler HostObject (that would not crash the app)
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
      test(true, 'true');
      test(false, 'false');
      test('foo', 'foo');

      test(Infinity, 'Infinity');
      test(NaN, 'NaN');
      test(undefined, 'undefined');
      test(null, 'null');

      test([], '[]');
      test([1], '[1]');
      test([1, 2, 3], '[1, 2, 3]');

      test({}, '{}');
      test({ foo: 'foo' }, '{"foo": "foo"}');
      test(
        { foo: 'foo', bar: 'bar', baz: 'baz' },
        '{"foo": "foo", "bar": "bar", "baz": "baz"}'
      );
      // test(testHostObject, '[jsi::HostObject(<ClassName>) <props>]'); // TODO: Add a test for jsi::HostObject

      test(() => {}, '[Function anonymous]');
      test(function () {}, '[Function anonymous]');
      test(function foo() {}, '[Function foo]');
      test(isFinite, '[Function isFinite]');
      test(Object, '[Function Object]');
      test(_log, '[jsi::HostFunction _log]');
      // test(Math, '[Math]'); // TODO: how to detect the Math object?

      {
        let a = {};
        a.foo = a;
        a.bar = 'bar';
        test(a, '{"foo": {...}, "bar": "bar"}');
      }
      {
        let b = [];
        b.push(1);
        b.push(b);
        test(b, '[1, [...]]');
      }

      test(new Map(), 'Map {}');
      {
        const map = new Map();
        map.set('foo', 'foo');
        map.set('bar', 'bar');
        map.set('baz', 'baz');
        test(map, 'Map {"foo": "foo", "bar": "bar", "baz": "baz"}');
      }
      test(new Set(), 'Set {}');
      {
        const set = new Set();
        set.add(1);
        set.add(2);
        set.add(3);
        test(set, 'Set {1, 2, 3}');
      }
      test(new WeakMap(), '[WeakMap]');
      test(new WeakSet(), '[WeakSet]');

      test(Symbol('foo'), 'Symbol(foo)');
      test(BigInt(123456), '123456n');

      test(new ArrayBuffer(42), '[ArrayBuffer]');
      test(new DataView(new ArrayBuffer(42)), '[DataView]'); // wait for PR
      test(new Promise(() => {}), '[Promise]');
      test(new Uint8Array(), '[Uint8Array]');
      test(new Int32Array(), '[Int32Array]');
      test(new Date(0), 'Thu Jan 01 1970 01:00:00 GMT+0100');
      test(new Error('foo'), '[Error: foo]');
      test(new TypeError('bar'), '[TypeError: bar]');
      test(new RegExp('foo'), '/foo/');
      test(String('foo'), 'foo');

      _log('Tests passed'); // TODO: Cleanup tests after fixing all
    })();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Analyze the output in the console</Text>
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
  text: {
    fontSize: 20,
    color: 'black',
  },
});
