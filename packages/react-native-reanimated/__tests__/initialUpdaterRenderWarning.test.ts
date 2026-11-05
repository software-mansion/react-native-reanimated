import { makeMutable } from '../src';
import { initialUpdaterRun } from '../src/animation/utilCommon';
import {
  getLoggerConfig,
  ReanimatedLogLevel,
  updateLoggerConfig,
} from '../src/common/logger';
import * as reactUtils from '../src/reactUtils';

const onLog = jest.fn();
const originalConfig = getLoggerConfig();

beforeEach(() => {
  jest.spyOn(reactUtils, 'isReactRendering').mockReturnValue(true);
  jest.spyOn(reactUtils, 'isFirstReactRender').mockReturnValue(false);
  updateLoggerConfig(
    { ...originalConfig, logFunction: jest.fn() },
    { level: ReanimatedLogLevel.warn, strict: true },
    onLog
  );
});

afterEach(() => {
  jest.restoreAllMocks();
  onLog.mockClear();
  updateLoggerConfig(originalConfig, originalConfig, originalConfig.onLog);
});

test('initial updater reads return the current value without render warnings', () => {
  const shared = makeMutable(17);

  expect(
    initialUpdaterRun(() => ({
      transform: [{ translateY: shared.value + shared.get() }],
    }))
  ).toEqual({ transform: [{ translateY: 34 }] });
  expect(onLog).not.toHaveBeenCalled();
});

test('direct render reads still warn after a successful initial updater', () => {
  const shared = makeMutable(17);
  initialUpdaterRun(() => shared.value);
  onLog.mockClear();

  expect(shared.value).toBe(17);
  expect(shared.get()).toBe(17);

  expect(onLog).toHaveBeenCalledTimes(2);
  expect(onLog).toHaveBeenCalledWith({
    level: ReanimatedLogLevel.warn,
    message: expect.stringContaining(
      'Reading from `value` during component render'
    ),
  });
});

test('writes still warn both inside and outside an initial updater', () => {
  const shared = makeMutable(17);
  shared.value = 18;
  initialUpdaterRun(() => {
    shared.set(19);
  });

  expect(onLog).toHaveBeenCalledTimes(2);
  expect(onLog).toHaveBeenNthCalledWith(1, {
    level: ReanimatedLogLevel.warn,
    message: expect.stringContaining(
      'Writing to `value` during component render'
    ),
  });
  expect(onLog).toHaveBeenNthCalledWith(2, {
    level: ReanimatedLogLevel.warn,
    message: expect.stringContaining(
      'Writing to `value` during component render'
    ),
  });
});

test('a throwing initial updater does not suppress later render warnings', () => {
  const shared = makeMutable(17);
  expect(() =>
    initialUpdaterRun(() => {
      throw new Error('[Reanimated] updater failed');
    })
  ).toThrow('updater failed');

  expect(shared.value).toBe(17);
  expect(onLog).toHaveBeenCalledTimes(1);
});
