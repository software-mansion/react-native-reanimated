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
