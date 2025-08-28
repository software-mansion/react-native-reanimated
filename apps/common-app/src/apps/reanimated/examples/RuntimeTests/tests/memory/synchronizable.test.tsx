import {
  isSynchronizable,
  createSynchronizable,
  runOnUI,
  executeOnUIRuntimeSync,
  runOnJS,
  createWorkletRuntime,
  runOnRuntime,
  type Synchronizable,
} from 'react-native-worklets';
import { describe, expect, notify, test, waitForNotification } from '../../ReJest/RuntimeTestsApi';

const NOTIFICATION = 'NOTIFICATION';

describe('Test Synchronizable creation and serialization', () => {
  test('createSynchronizable returns Synchronizable', () => {
    const synchronizable = createSynchronizable(0);

    expect(isSynchronizable(synchronizable)).toBe(true);
  });

  test('Synchronizable serializes correctly from RN Runtime to UI Runtime', () => {
    const synchronizable = createSynchronizable(0);
    const value = executeOnUIRuntimeSync(() => {
      return synchronizable.getBlocking();
    })();

    expect(value).toBe(0);
  });

  test('Synchronizable serializes correctly from RN Runtime to BG Runtime', async () => {
    const synchronizable = createSynchronizable(42);

    let readValue = 0;
    const onJSCallback = (value: number) => {
      readValue = value;
      notify(NOTIFICATION);
    };

    // Act
    const runtime = createWorkletRuntime({
      name: 'test',
    });
    runOnRuntime(runtime, () => {
      'worklet';
      const value = synchronizable.getBlocking();
      runOnJS(onJSCallback)(value);
    })();
    await waitForNotification(NOTIFICATION);

    // Assert
    expect(readValue).toBe(42);
  });

  test('Synchronizable serializes correctly from UI Runtime to RN runtime', () => {
    const synchronizable = createSynchronizable(0);
    const synchronizableCopy = executeOnUIRuntimeSync(() => {
      return synchronizable;
    })();

    const value = synchronizableCopy.getBlocking();
    expect(value).toBe(0);
  });

  test('Synchronizable serializes correctly from BG Runtime to RN Runtime', async () => {
    const synchronizable = createSynchronizable(42);
    let synchronizableCopy: Synchronizable<number>;

    const onJSCallback = (value: Synchronizable<number>) => {
      synchronizableCopy = value;
      notify(NOTIFICATION);
    };

    // Act
    const runtime = createWorkletRuntime({
      name: 'test',
    });
    runOnRuntime(runtime, () => {
      'worklet';
      runOnJS(onJSCallback)(synchronizable);
    })();
    await waitForNotification(NOTIFICATION);

    const value = synchronizableCopy!.getBlocking();
    expect(value).toBe(42);
  });

  // TODO: This test doesn't work because nested `runOnJS` isn't copied properly.
  // It will be fixed when BundleMode™ becomes the standard.
  // test('Synchronizable serializes correctly from UI Runtime to BG Runtime', async () => {
  //   const synchronizable = createSynchronizable(42);
  //   let readValue = 0;

  //   const onJSCallback = (value: number) => {
  //     readValue = value;
  //     notify(NOTIFICATION);
  //   };

  //   // Act
  //   const runtime = createWorkletRuntime({
  //     name: 'test',
  //   });
  //   runOnUI(() => {
  //     runOnRuntime(runtime, () => {
  //       'worklet';
  //       const value = synchronizable.getBlocking();
  //       console.log(runOnJS);
  //       runOnJS(onJSCallback)(value);
  //     })();
  //   })();

  //   await waitForNotify(NOTIFICATION);

  //   expect(readValue).toBe(42);
  // });
});

const initialValue = 0;

const targetValue = 100000;

function getDirtySetBlocking(synchronizable: Synchronizable<number>) {
  'worklet';
  for (let i = 0; i < targetValue; i++) {
    const value = synchronizable.getDirty();
    synchronizable.setBlocking(value + 1);
  }
  return synchronizable.getBlocking();
}

function getBlockingSetBlocking(synchronizable: Synchronizable<number>) {
  'worklet';
  for (let i = 0; i < targetValue; i++) {
    const value = synchronizable.getBlocking();
    synchronizable.setBlocking(value + 1);
  }
  return synchronizable.getBlocking();
}

function transactionGetSet(synchronizable: Synchronizable<number>) {
  'worklet';
  for (let i = 0; i < targetValue; i++) {
    synchronizable.setBlocking(prev => prev + 1);
  }
  return synchronizable.getBlocking();
}

function imperativeLockGetSet(synchronizable: Synchronizable<number>) {
  'worklet';
  for (let i = 0; i < targetValue; i++) {
    synchronizable.lock();
    const value = synchronizable.getBlocking();
    synchronizable.setBlocking(value + 1);
    synchronizable.unlock();
  }
  return synchronizable.getBlocking();
}

function dispatch(
  method: (synchronizable: Synchronizable<number>) => number,
  callbackRN: (value: number) => void,
  callbackUI: (value: number) => void,
  callbackBG: (value: number) => void,
) {
  const synchronizable = createSynchronizable(initialValue);
  const runtime = createWorkletRuntime({ name: 'test' });
  runOnRuntime(runtime, () => {
    'worklet';
    const value = method(synchronizable);
    runOnJS(callbackBG)(value);
  })();

  runOnUI(() => {
    'worklet';
    const value = method(synchronizable);
    runOnJS(callbackUI)(value);
  })();

  queueMicrotask(() => {
    const value = method(synchronizable);
    runOnJS(callbackRN)(value);
  });
}

describe('Test Synchronizable access', () => {
  test('dirty reading yields intermediate values', async () => {
    let valueRN = 0;
    let valueUI = 0;
    let valueBG = 0;

    function setValueRN(value: number) {
      valueRN = value;
      if (valueRN > 0 && valueUI > 0 && valueBG > 0) {
        notify(NOTIFICATION);
      }
    }

    function setValueUI(value: number) {
      valueUI = value;
      if (valueRN > 0 && valueUI > 0 && valueBG > 0) {
        notify(NOTIFICATION);
      }
    }

    function setValueBG(value: number) {
      valueBG = value;
      if (valueRN > 0 && valueUI > 0 && valueBG > 0) {
        notify(NOTIFICATION);
      }
    }

    dispatch(getDirtySetBlocking, setValueRN, setValueUI, setValueBG);

    await waitForNotification(NOTIFICATION);

    expect(valueRN).toBeWithinRange(initialValue + 1, targetValue * 3 - 1);
    expect(valueUI).toBeWithinRange(initialValue + 1, targetValue * 3 - 1);
    expect(valueBG).toBeWithinRange(initialValue + 1, targetValue * 3 - 1);
  });

  test('blocking reading yields intermediate values', async () => {
    let valueRN = 0;
    let valueUI = 0;
    let valueBG = 0;

    function setValueRN(value: number) {
      valueRN = value;
      if (valueRN > 0 && valueUI > 0 && valueBG > 0) {
        notify(NOTIFICATION);
      }
    }

    function setValueUI(value: number) {
      valueUI = value;
      if (valueRN > 0 && valueUI > 0 && valueBG > 0) {
        notify(NOTIFICATION);
      }
    }

    function setValueBG(value: number) {
      valueBG = value;
      if (valueRN > 0 && valueUI > 0 && valueBG > 0) {
        notify(NOTIFICATION);
      }
    }

    dispatch(getBlockingSetBlocking, setValueRN, setValueUI, setValueBG);

    await waitForNotification(NOTIFICATION);

    expect(valueRN).toBeWithinRange(initialValue + 1, targetValue * 3 - 1);
    expect(valueUI).toBeWithinRange(initialValue + 1, targetValue * 3 - 1);
    expect(valueBG).toBeWithinRange(initialValue + 1, targetValue * 3 - 1);
  });

  test('transaction reading is atomic', async () => {
    let valueRN = 0;
    let valueUI = 0;
    let valueBG = 0;

    function setValueRN(value: number) {
      valueRN = value;
      if (valueRN > 0 && valueUI > 0 && valueBG > 0) {
        notify(NOTIFICATION);
      }
    }

    function setValueUI(value: number) {
      valueUI = value;
      if (valueRN > 0 && valueUI > 0 && valueBG > 0) {
        notify(NOTIFICATION);
      }
    }

    function setValueBG(value: number) {
      valueBG = value;
      if (valueRN > 0 && valueUI > 0 && valueBG > 0) {
        notify(NOTIFICATION);
      }
    }

    dispatch(transactionGetSet, setValueRN, setValueUI, setValueBG);

    await waitForNotification(NOTIFICATION);

    expect(Math.max(valueRN, valueUI, valueBG)).toBe(targetValue * 3);
  });

  test('imperative locking reading is atomic', async () => {
    let valueRN = 0;
    let valueUI = 0;
    let valueBG = 0;

    function setValueRN(value: number) {
      valueRN = value;
      if (valueRN > 0 && valueUI > 0 && valueBG > 0) {
        notify(NOTIFICATION);
      }
    }

    function setValueUI(value: number) {
      valueUI = value;
      if (valueRN > 0 && valueUI > 0 && valueBG > 0) {
        notify(NOTIFICATION);
      }
    }

    function setValueBG(value: number) {
      valueBG = value;
      if (valueRN > 0 && valueUI > 0 && valueBG > 0) {
        notify(NOTIFICATION);
      }
    }

    dispatch(imperativeLockGetSet, setValueRN, setValueUI, setValueBG);

    await waitForNotification(NOTIFICATION);

    expect(Math.max(valueRN, valueUI, valueBG)).toBe(targetValue * 3);
  });
});
