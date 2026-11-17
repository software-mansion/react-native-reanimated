import { configureReanimatedLogger } from '../src';
import { logger, ReanimatedLogLevel } from '../src/common';

const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
const errorSpy = jest.spyOn(console, 'error').mockImplementation();

afterEach(() => {
  warnSpy.mockClear();
  errorSpy.mockClear();
});

const containing = (msg: string) => expect.stringContaining(msg);

describe('default settings', () => {
  test.each([
    ['warn', (msg: string) => logger.warn(msg), warnSpy, errorSpy],
    ['error', (msg: string) => logger.error(msg), errorSpy, warnSpy],
  ] as const)(
    'logger.%s forwards to matching console method',
    (_level, log, expectedSpy, otherSpy) => {
      log('test message');

      expect(expectedSpy).toHaveBeenCalledWith(containing('test message'));
      expect(otherSpy).not.toHaveBeenCalled();
    }
  );
});

describe('level: error', () => {
  beforeEach(() => {
    configureReanimatedLogger({ level: ReanimatedLogLevel.error });
  });

  test('suppresses warnings but not errors', () => {
    logger.warn('suppressed');
    expect(warnSpy).not.toHaveBeenCalled();

    logger.error('visible');
    expect(errorSpy).toHaveBeenCalledWith(containing('visible'));
  });
});

describe('strict: true', () => {
  beforeEach(() => {
    configureReanimatedLogger({ strict: true });
  });

  test.each([
    ['warn', (msg: string) => logger.warn(msg, { strict: true }), warnSpy],
    ['error', (msg: string) => logger.error(msg, { strict: true }), errorSpy],
  ] as const)('forwards strict %s with docs reference', (_level, log, spy) => {
    log('strict message');

    expect(spy).toHaveBeenCalledWith(containing('strict message'));
    expect(spy).toHaveBeenCalledWith(containing('https://docs.swmansion.com'));
  });
});

describe('strict: false', () => {
  beforeEach(() => {
    configureReanimatedLogger({ strict: false });
  });

  test('suppresses strict messages but not regular ones', () => {
    logger.warn('strict-only', { strict: true });
    expect(warnSpy).not.toHaveBeenCalled();

    logger.warn('regular');
    expect(warnSpy).toHaveBeenCalledWith(containing('regular'));
  });
});

describe('onLog callback', () => {
  const onLog = jest.fn();

  afterEach(() => {
    onLog.mockClear();
  });

  test.each([
    [
      'warn',
      (msg: string) => logger.warn(msg),
      ReanimatedLogLevel.warn,
      warnSpy,
    ],
    [
      'error',
      (msg: string) => logger.error(msg),
      ReanimatedLogLevel.error,
      errorSpy,
    ],
  ] as const)(
    'receives %s logs alongside the console output',
    (_level, log, expectedLevel, spy) => {
      configureReanimatedLogger({}, onLog);

      log('test message');

      expect(onLog).toHaveBeenCalledWith({
        level: expectedLevel,
        message: containing('test message'),
      });
      expect(spy).toHaveBeenCalledWith(containing('test message'));
    }
  );

  test('receives the message with the Reanimated prefix', () => {
    configureReanimatedLogger({}, onLog);

    logger.warn('test message');

    expect(onLog).toHaveBeenCalledWith({
      level: ReanimatedLogLevel.warn,
      message: '[Reanimated] test message',
    });
  });

  test('is not called for logs below the configured level', () => {
    configureReanimatedLogger({ level: ReanimatedLogLevel.error }, onLog);

    logger.warn('suppressed');
    expect(onLog).not.toHaveBeenCalled();

    logger.error('visible');
    expect(onLog).toHaveBeenCalledWith({
      level: ReanimatedLogLevel.error,
      message: containing('visible'),
    });
  });

  test('is not called for strict logs when strict mode is disabled', () => {
    configureReanimatedLogger({ strict: false }, onLog);

    logger.warn('strict-only', { strict: true });
    expect(onLog).not.toHaveBeenCalled();

    logger.warn('regular');
    expect(onLog).toHaveBeenCalledWith({
      level: ReanimatedLogLevel.warn,
      message: containing('regular'),
    });
  });

  test('receives the docs reference for strict logs', () => {
    configureReanimatedLogger({ strict: true }, onLog);

    logger.warn('strict message', { strict: true });

    expect(onLog).toHaveBeenCalledWith({
      level: ReanimatedLogLevel.warn,
      message: containing('https://docs.swmansion.com'),
    });
  });

  test('is cleared by a later call that omits it', () => {
    configureReanimatedLogger({}, onLog);
    configureReanimatedLogger({});

    logger.warn('test message');

    expect(onLog).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(containing('test message'));
  });
});
