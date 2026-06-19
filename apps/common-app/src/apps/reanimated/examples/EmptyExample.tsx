import React, { useState } from 'react';
import { Button, ScrollView, StyleSheet, Text } from 'react-native';
import type { TransferableArrayBuffer } from 'react-native-worklets';
import {
  createTransferableArrayBuffer,
  runOnUISync,
  scheduleOnRN,
} from 'react-native-worklets';

// `createTransferableArrayBuffer(n)` returns a real `ArrayBuffer` augmented with
// `transferable` + `transfer()`. `transfer()` moves ownership and detaches the
// source in EVERY runtime (byteLength -> 0, views -> length 0, detached -> true).
//
// Reading or printing a typed array whose buffer is detached throws a TypeError,
// so we never touch a detached view's elements - a check for
// arrayBuf.buffer.detached === true is needed.
declare global {
  interface ArrayBuffer {
    readonly detached?: boolean;
  }
  interface SharedArrayBuffer {
    readonly detached?: boolean;
  }
}

export default function EmptyExample() {
  const [log, setLog] = useState<string[]>([]);
  const append = (line: string) => setLog((prev) => [...prev, line]);
  const reset = () => setLog([]);

  // Example 1: transfer from RN to UI.
  const example1 = () => {
    reset();
    const buf = createTransferableArrayBuffer(1024);
    append(`buf.transferable = ${buf.transferable}`); // true

    const view = new Uint8Array(buf);

    // Observes RN-side buf/view (runs back on RN, closes over them). We must NOT
    // read the detached view's elements (that throws) - we check its buffer.
    const observeRN = () => {
      append(`RN: view.buffer.detached = ${view.buffer.detached}`); // true
      append(
        `RN: buf.detached = ${buf.detached}, byteLength = ${buf.byteLength}`
      ); // true, 0
    };

    runOnUISync(() => {
      'worklet';
      const buf2 = buf.transfer(); // ownership moves RN -> UI

      // buf2 is live, so reading its view is fine.
      const view2 = new Uint8Array(buf2);
      scheduleOnRN(
        append,
        `UI: view2.length = ${view2.length}, view2[0] = ${view2[0]}`
      ); // 1024, 0

      // On RN, buf/view are now detached.
      scheduleOnRN(observeRN);
    });
  };

  // Example 2: the result of `.transfer()` is itself transferable.
  const example2 = () => {
    reset();
    const buf = createTransferableArrayBuffer(1024);
    append(`buf.transferable = ${buf.transferable}`); // true

    const next = buf.transfer();
    append(`next.transferable = ${next.transferable}`); // true — preserved

    const again = next.transfer();
    append(`again.transferable = ${again.transferable}`); // true
  };

  // Example 3: transfer back from UI to RN.
  const example3 = () => {
    reset();
    let buf = createTransferableArrayBuffer(1024);

    // Hand ownership back to RN by transferring the buffer into RN's `buf`.
    const handBack = (ext: TransferableArrayBuffer) => {
      buf = ext.transfer();
    };
    const observeRN = () => {
      append(`RN: buf.byteLength = ${buf.byteLength}`); // 1024 (live again)
      append(`RN: new Uint8Array(buf).length = ${new Uint8Array(buf).length}`); // 1024
    };

    runOnUISync(() => {
      'worklet';
      const buf2 = buf.transfer(); // RN -> UI

      scheduleOnRN(handBack, buf2.transfer()); // UI -> RN
      scheduleOnRN(observeRN); // on RN, buf is live again

      scheduleOnRN(append, `UI: buf2.byteLength = ${buf2.byteLength}`); // 0 (detached on UI)
    });
  };

  // Example 4: a buffer can be transferred many times.
  const example4 = () => {
    reset();
    let buf = createTransferableArrayBuffer(1024);

    const handBack = (ext: TransferableArrayBuffer) => {
      buf = ext.transfer();
    };
    const observeRN = () => {
      append(`RN: buf.byteLength = ${buf.byteLength}`); // 1024
      append(`RN: new Uint8Array(buf).length = ${new Uint8Array(buf).length}`); // 1024
    };

    runOnUISync(() => {
      'worklet';
      const onUI = buf.transfer(); // RN -> UI
      scheduleOnRN(handBack, onUI.transfer()); // UI -> RN
    });

    runOnUISync(() => {
      'worklet';
      const onUI = buf.transfer(); // RN -> UI again
      scheduleOnRN(handBack, onUI.transfer()); // UI -> RN again
    });

    scheduleOnRN(observeRN); // still valid after repeated transfers
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Button title="Example 1: transfer RN -> UI" onPress={example1} />
      <Button
        title="Example 2: transfer preserves transferable"
        onPress={example2}
      />
      <Button title="Example 3: transfer back UI -> RN" onPress={example3} />
      <Button title="Example 4: transfer many times" onPress={example4} />
      {log.map((line, index) => (
        <Text key={index} style={styles.line}>
          {line}
        </Text>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 16,
  },
  line: {
    marginTop: 6,
    fontSize: 12,
  },
});
