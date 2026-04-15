import {
  createShareable,
  runOnUISync,
  createWorkletRuntime,
  runOnRuntimeSync,
  type ShareableGuest,
  type ShareableGuestDecorator,
  type ShareableHostDecorator,
  isShareable,
  type ShareableHost,
  UIRuntimeId,
} from 'react-native-worklets';
import { describe, expect, test } from '../../ReJest/RuntimeTestsApi';

type StringDecorated = {
  myDecoration: string;
};

const decorateGuestProperty: ShareableGuestDecorator<number, StringDecorated> = shareable => {
  'worklet';
  shareable.myDecoration = 'decorated';
  return shareable;
};

type FunctionDecorated = {
  myDecorationFunction: () => string;
};

const decorateGuestFunction: ShareableGuestDecorator<number, FunctionDecorated> = shareable => {
  'worklet';
  shareable.myDecorationFunction = () => 'decorated function';
  return shareable;
};

const decorateGuestOverride: ShareableGuestDecorator<number> = shareable => {
  'worklet';
  shareable.getSync = () => {
    return -1;
  };
  return shareable;
};

const decorateHostProperty: ShareableHostDecorator<number, StringDecorated> = shareable => {
  'worklet';
  shareable.myDecoration = 'decorated host';
  return shareable;
};

const decorateHostFunction: ShareableHostDecorator<number, FunctionDecorated> = shareable => {
  'worklet';
  shareable.myDecorationFunction = () => 'decorated function';
  return shareable;
};

const decorateHostGetter: ShareableHostDecorator<number> = shareable => {
  'worklet';
  Object.defineProperty(shareable, 'value', {
    get() {
      return 42;
    },
  });
  return shareable;
};

const decorateHostSetter: ShareableHostDecorator<number> = shareable => {
  'worklet';
  let value = shareable.value;
  Object.defineProperty(shareable, 'value', {
    get() {
      return value + 42;
    },
    set(newValue) {
      value = newValue * 2;
    },
  });
  return shareable;
};

const initModes = ['initLazy', 'initSynchronously'];

const getInitOptions = (initMode: unknown) => ({
  initSynchronously: initMode === 'initSynchronously',
});

describe('Shareable hosted on UI', () => {
  const runtime = createWorkletRuntime({ name: 'test' });

  test.each(initModes)('can be hosted on UI (%s)', async initMode => {
    const fn = () => createShareable(UIRuntimeId, 0, getInitOptions(initMode));
    await expect(fn).not.toThrow();
  });

  test.each(initModes)('is recognized as shareable on RN Runtime (%s)', initMode => {
    const shareable = createShareable(UIRuntimeId, 0, getInitOptions(initMode));
    const isShareableResult = isShareable(shareable);
    expect(isShareableResult).toBe(true);
  });

  test.each(initModes)('is recognized as shareable on UI Runtime (%s)', initMode => {
    const shareable = createShareable(UIRuntimeId, 0, getInitOptions(initMode));
    const isShareableResult = runOnUISync(() => {
      'worklet';
      return isShareable(shareable);
    });
    expect(isShareableResult).toBe(true);
  });

  test.each(initModes)('is recognized as shareable on Worker Runtime (%s)', initMode => {
    const shareable = createShareable(UIRuntimeId, 0, getInitOptions(initMode));
    const isShareableResult = runOnRuntimeSync(runtime, () => {
      'worklet';
      return isShareable(shareable);
    });
    expect(isShareableResult).toBe(true);
  });

  test.each(initModes)('reads value on UI Runtime (%s)', initMode => {
    const shareable = createShareable(UIRuntimeId, 0, getInitOptions(initMode));
    const value = runOnUISync(() => (shareable as ShareableHost<number>).value);
    expect(value).toBe(0);
  });

  test.each(initModes)('sets value on UI Runtime (%s)', initMode => {
    const shareable = createShareable(UIRuntimeId, 0, getInitOptions(initMode));
    const value = runOnUISync(() => {
      shareable.value = 42;
      return shareable.value;
    });
    expect(value).toBe(42);
  });

  test.each(initModes)('getSync as guest on RN Runtime (%s)', initMode => {
    const shareable = createShareable(UIRuntimeId, 0, getInitOptions(initMode));
    const value = (shareable as ShareableGuest<number>).getSync();
    expect(value).toBe(0);
  });

  test.each(initModes)('getAsync as guest on RN Runtime (%s)', async initMode => {
    const shareable = createShareable(UIRuntimeId, 0, getInitOptions(initMode));
    const value = await (shareable as ShareableGuest<number>).getAsync();
    expect(value).toBe(0);
  });

  test.each(initModes)('setSync as guest on RN Runtime (%s)', initMode => {
    const shareable = createShareable(UIRuntimeId, 0, getInitOptions(initMode));
    (shareable as ShareableGuest<number>).setSync(42);
    const value = (shareable as ShareableGuest<number>).getSync();
    expect(value).toBe(42);
  });

  test.each(initModes)('setAsync as guest on RN Runtime (%s)', async initMode => {
    const shareable = createShareable(UIRuntimeId, 0, getInitOptions(initMode));
    (shareable as ShareableGuest<number>).setAsync(42);
    const value = await (shareable as ShareableGuest<number>).getAsync();
    expect(value).toBe(42);
  });

  test.each(initModes)('getSync as guest on Worker Runtime (%s)', initMode => {
    const shareable = createShareable(UIRuntimeId, 0, getInitOptions(initMode));

    const value = runOnRuntimeSync(runtime, () => {
      'worklet';
      return (shareable as ShareableGuest<number>).getSync();
    });

    expect(value).toBe(0);
  });

  test.each(initModes)('getAsync as guest on Worker Runtime (%s)', async () => {
    // Not implemented
  });

  test.each(initModes)('setSync as guest on Worker Runtime (%s)', initMode => {
    const shareable = createShareable(UIRuntimeId, 0, getInitOptions(initMode));

    runOnRuntimeSync(runtime, () => {
      'worklet';
      (shareable as ShareableGuest<number>).setSync(42);
    });
    const value = (shareable as ShareableGuest<number>).getSync();

    expect(value).toBe(42);
  });

  test.each(initModes)('setAsync as guest on Worker Runtime (%s)', async initMode => {
    const shareable = createShareable(UIRuntimeId, 0, getInitOptions(initMode));

    runOnRuntimeSync(runtime, () => {
      'worklet';
      (shareable as ShareableGuest<number>).setAsync(42);
    });
    const value = await (shareable as ShareableGuest<number>).getAsync();

    expect(value).toBe(42);
  });

  test.each(initModes)('host decorator adds property (%s)', initMode => {
    const shareable = createShareable(UIRuntimeId, 0, {
      ...getInitOptions(initMode),
      hostDecorator: decorateHostProperty,
    });
    const decoration = runOnUISync(() => {
      'worklet';
      return shareable.myDecoration;
    });
    expect(decoration).toBe('decorated host');
  });

  test.each(initModes)('host decorator adds function (%s)', initMode => {
    const shareable = createShareable(UIRuntimeId, 0, {
      ...getInitOptions(initMode),
      hostDecorator: decorateHostFunction,
    });
    const decorationResult = runOnUISync(() => {
      'worklet';
      return shareable.myDecorationFunction!();
    });
    expect(decorationResult).toBe('decorated function');
  });

  test.each(initModes)('host decorator overrides getter (%s)', initMode => {
    const shareable = createShareable(UIRuntimeId, 0, {
      ...getInitOptions(initMode),
      hostDecorator: decorateHostGetter,
    });
    const value = runOnUISync(() => shareable.value);
    expect(value).toBe(42);
  });

  test.each(initModes)('host decorator overrides setter (%s)', initMode => {
    const shareable = createShareable(UIRuntimeId, 0, {
      ...getInitOptions(initMode),
      hostDecorator: decorateHostSetter,
    });
    const valuePre = runOnUISync(() => {
      'worklet';
      return shareable.value;
    });
    const valuePost = runOnUISync(() => {
      'worklet';
      shareable.value = 42;
      return shareable.value;
    });
    expect(valuePre).toBe(42);
    expect(valuePost).toBe(42 + 42 * 2);
  });

  test.each(initModes)('guest decorator on RN Runtime adds property (%s)', initMode => {
    const shareable = createShareable(UIRuntimeId, 0, {
      ...getInitOptions(initMode),
      guestDecorator: decorateGuestProperty,
    });
    const decoration = shareable.myDecoration;
    expect(decoration).toBe('decorated');
  });

  test.each(initModes)('guest decorator on RN Runtime adds function (%s)', initMode => {
    const shareable = createShareable(UIRuntimeId, 0, {
      ...getInitOptions(initMode),
      guestDecorator: decorateGuestFunction,
    });
    const decorationResult = shareable.myDecorationFunction!();
    expect(decorationResult).toBe('decorated function');
  });

  test.each(initModes)('guest decorator on RN Runtime overrides method (%s)', initMode => {
    const shareable = createShareable(UIRuntimeId, 0, {
      ...getInitOptions(initMode),
      guestDecorator: decorateGuestOverride,
    });
    const getSyncValue = shareable.getSync!();
    expect(getSyncValue).toBe(-1);
  });

  test.each(initModes)('guest decorator on Worker Runtime adds property (%s)', initMode => {
    const shareable = createShareable(UIRuntimeId, 0, {
      ...getInitOptions(initMode),
      guestDecorator: decorateGuestProperty,
    });
    const runtime = createWorkletRuntime({ name: 'test' });

    const decoration = runOnRuntimeSync(runtime, () => {
      'worklet';
      return shareable.myDecoration;
    });

    expect(decoration).toBe('decorated');
  });

  test.each(initModes)('guest decorator on Worker Runtime adds function (%s)', initMode => {
    const shareable = createShareable(UIRuntimeId, 0, {
      ...getInitOptions(initMode),
      guestDecorator: decorateGuestFunction,
    });
    const runtime = createWorkletRuntime({ name: 'test' });

    const decorationResult = runOnRuntimeSync(runtime, () => {
      'worklet';
      return shareable.myDecorationFunction!();
    });

    expect(decorationResult).toBe('decorated function');
  });

  test.each(initModes)('guest decorator on Worker Runtime overrides method (%s)', initMode => {
    const shareable = createShareable(UIRuntimeId, 0, {
      ...getInitOptions(initMode),
      guestDecorator: decorateGuestOverride,
    });
    const runtime = createWorkletRuntime({ name: 'test' });

    const getSyncValue = runOnRuntimeSync(runtime, () => {
      'worklet';
      return shareable.getSync!();
    });

    expect(getSyncValue).toBe(-1);
  });
});
