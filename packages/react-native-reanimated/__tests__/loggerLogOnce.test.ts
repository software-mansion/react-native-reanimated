import {
  getLoggerConfig,
  logger,
  ReanimatedLogLevel,
  updateLoggerConfig,
} from '../src/common/logger';

const logFunction = jest.fn();
const onLog = jest.fn();
let error: Error;

beforeEach(() => {
  global.__reanimatedLoggedMessages = undefined;
  updateLoggerConfig({ ...getLoggerConfig(), logFunction }, {}, onLog);
  error = new Error();
  error.stack = [
    'Error',
    '    at logOnce (logger.ts:140:20)',
    '    at useDerivedValue (useDerivedValue.ts:34:12)',
    '    at LibraryComponent (someoneslib/src/labubu.js:21:37)',
    '    at renderWithHooks (react.js:100:10)',
  ].join('\n');
  jest.spyOn(global, 'Error').mockImplementation(() => error);
});

afterEach(() => {
  jest.restoreAllMocks();
  logFunction.mockClear();
  onLog.mockClear();
});

test('prints only once for the selected caller, including its location', () => {
  logger.logOnce('dependencies warning', 1);
  logger.logOnce('dependencies warning', 1);

  expect(logFunction).toHaveBeenCalledTimes(1);
  expect(logFunction).toHaveBeenCalledWith({
    level: ReanimatedLogLevel.warn,
    message:
      '[Reanimated] dependencies warning\nat LibraryComponent (someoneslib/src/labubu.js:21:37)',
  });
  expect(onLog).toHaveBeenCalledTimes(1);
  expect(onLog).toHaveBeenCalledWith(logFunction.mock.calls[0][0]);
});

test('different callers and different messages are not suppressed', () => {
  logger.logOnce('first', 1);
  error.stack = error.stack!.replace('21:37', '42:37');
  logger.logOnce('first', 1);
  logger.logOnce('second', 1);

  expect(logFunction).toHaveBeenCalledTimes(3);
});

test('zero selects the direct caller and ignores changes higher in the stack', () => {
  logger.logOnce('warning', 0);
  error.stack = error.stack!.replace('21:37', '42:37');
  logger.logOnce('warning', 0);

  expect(logFunction).toHaveBeenCalledTimes(1);
  expect(logFunction.mock.calls[0][0].message).toContain(
    'at useDerivedValue (useDerivedValue.ts:34:12)'
  );
});

test('supports JavaScriptCore stacks without an Error header', () => {
  error.stack = [
    'logOnce@logger.ts:140:20',
    'useDerivedValue@useDerivedValue.ts:34:12',
    'LibraryComponent@someoneslib/src/labubu.js:21:37',
    '',
  ].join('\n');
  logger.logOnce('warning', 1);
  logger.logOnce('warning', 1);

  expect(logFunction).toHaveBeenCalledTimes(1);
  expect(logFunction.mock.calls[0][0].message).toContain(
    'LibraryComponent@someoneslib/src/labubu.js:21:37'
  );
});

test('supports Hermes bytecode locations', () => {
  error.stack = [
    'Error',
    '    at logOnce (address at index.bundle:1:100)',
    '    at useDerivedValue (address at index.bundle:1:200)',
    '    at LibraryComponent (address at index.bundle:1:300)',
  ].join('\n');
  logger.logOnce('warning', 1);
  logger.logOnce('warning', 1);

  expect(logFunction).toHaveBeenCalledTimes(1);
  expect(logFunction.mock.calls[0][0].message).toContain(
    'at LibraryComponent (address at index.bundle:1:300)'
  );
});

test.each([undefined, '', 'Error'])(
  'falls back to message-only deduplication when the stack is %p',
  (stack) => {
    error.stack = stack;
    logger.logOnce('warning', 1);
    logger.logOnce('warning', 1);

    expect(logFunction).toHaveBeenCalledTimes(1);
    expect(logFunction.mock.calls[0][0].message).toBe('[Reanimated] warning');
  }
);

test.each([-1, 0.5, 100, NaN])(
  'falls back to message-only deduplication for unavailable depth %p',
  (level) => {
    logger.logOnce('warning', level);
    logger.logOnce('warning', level);

    expect(logFunction).toHaveBeenCalledTimes(1);
    expect(logFunction.mock.calls[0][0].message).toBe('[Reanimated] warning');
  }
);

test('filtered warnings do not consume the once-only entry', () => {
  updateLoggerConfig(getLoggerConfig(), { level: ReanimatedLogLevel.error });
  logger.logOnce('warning', 1);
  expect(logFunction).not.toHaveBeenCalled();

  updateLoggerConfig(getLoggerConfig(), {});
  logger.logOnce('warning', 1);
  expect(logFunction).toHaveBeenCalledTimes(1);
});

test('ordinary warnings are still printed every time', () => {
  logger.warn('warning');
  logger.warn('warning');
  expect(logFunction).toHaveBeenCalledTimes(2);
});
