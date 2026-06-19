import type { TransferableArrayBuffer } from 'react-native-worklets';
import {
  createTransferableArrayBuffer,
  runOnUISync,
  scheduleOnRN,
} from 'react-native-worklets';

import {
  describe,
  expect,
  notify,
  test,
  waitForNotification,
} from '../../ReJest/RuntimeTestsApi';

describe('transferableArrayBuffer', () => {
  test('example 1 - transfer from RN to UI detaches the source in every runtime', async () => {
    const buf = createTransferableArrayBuffer(1024);
    expect(buf.transferable).toBe(true);

    const view = new Uint8Array(buf);
    expect(view.length).toBe(1024);

    const onUI = runOnUISync(() => {
      'worklet';
      const buf2 = buf.transfer();
      const view2 = new Uint8Array(buf2);
      return [buf2.byteLength, view2.length, view2[0]];
    });
    expect(onUI[0]).toBe(1024);
    expect(onUI[1]).toBe(1024);
    expect(onUI[2]).toBe(0);

    expect(buf.detached).toBe(true);
    expect(buf.byteLength).toBe(0);
    expect(view.length).toBe(0);
    expect(view.byteLength).toBe(0);

    await expect(() => new Uint8Array(buf)).toThrow();
    expect(view.buffer.detached).toBe(true);
  });

  test('example 2 - the result of transfer() is itself transferable', () => {
    const buf = createTransferableArrayBuffer(1024);
    expect(buf.transferable).toBe(true);

    const next = buf.transfer();
    expect(next.transferable).toBe(true);
    expect(buf.detached).toBe(true);

    const again = next.transfer();
    expect(again.transferable).toBe(true);
    expect(again.byteLength).toBe(1024);
    expect(next.detached).toBe(true);
    expect(again.detached).toBe(false);
  });

  test('example 3 - transfer back from UI to RN', async () => {
    const DONE = 'EXAMPLE_3_DONE';
    let buf = createTransferableArrayBuffer(1024);

    const handBack = (ext: TransferableArrayBuffer) => {
      buf = ext.transfer();
      notify(DONE);
    };

    runOnUISync(() => {
      'worklet';
      const buf2 = buf.transfer();
      scheduleOnRN(handBack, buf2.transfer());
    });

    await waitForNotification(DONE);

    expect(buf.detached).toBe(false);
    expect(buf.byteLength).toBe(1024);
    expect(new Uint8Array(buf).length).toBe(1024);
  });

  test('example 4 - a buffer can be transferred many times', async () => {
    const ROUND_1 = 'EXAMPLE_4_ROUND_1';
    const ROUND_2 = 'EXAMPLE_4_ROUND_2';
    let buf = createTransferableArrayBuffer(1024);

    const handBack = (ext: TransferableArrayBuffer, round: string) => {
      buf = ext.transfer();
      notify(round);
    };

    runOnUISync(() => {
      'worklet';
      const onUI = buf.transfer();
      scheduleOnRN(handBack, onUI.transfer(), ROUND_1);
    });
    await waitForNotification(ROUND_1);
    expect(buf.byteLength).toBe(1024);

    runOnUISync(() => {
      'worklet';
      const onUI = buf.transfer();
      scheduleOnRN(handBack, onUI.transfer(), ROUND_2);
    });
    await waitForNotification(ROUND_2);

    expect(buf.detached).toBe(false);
    expect(buf.byteLength).toBe(1024);
    expect(new Uint8Array(buf).length).toBe(1024);
  });
});
