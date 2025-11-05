import { version as packageVersion } from '../package.json';
import { checkCppVersion, matchVersion } from '../src/debug/checkCppVersion';
import { logger } from '../src/debug/logger';

describe('checkCppVersion', () => {
  beforeEach(() => {
    globalThis._WORKLETS_VERSION_CPP = packageVersion;
  });

  afterEach(() => {
    delete globalThis._WORKLETS_VERSION_CPP;
  });

  test('checks version successfully', () => {
    jest.spyOn(logger, 'warn').mockImplementation();
    checkCppVersion();
    expect(logger.warn).not.toHaveBeenCalled();
    jest.clearAllMocks();
  });

  test('throws error when version is undefined', () => {
    jest.spyOn(logger, 'warn').mockImplementation();
    delete globalThis._WORKLETS_VERSION_CPP;
    checkCppVersion();
    expect(logger.warn).toHaveBeenCalled();
    jest.clearAllMocks();
  });
});

describe('matchVersion', () => {
  test('matches versions', () => {
    expect(matchVersion('1.2.3', '1.2.3')).toBe(true);
  });

  test('validates patch mismatch', () => {
    expect(matchVersion('1.2.3', '1.2.4')).toBe(true);
  });

  test('invalidates minor mismatch', () => {
    expect(matchVersion('1.2.3', '1.3.3')).toBe(false);
  });

  test('invalidates major mismatch', () => {
    expect(matchVersion('1.2.3', '2.2.3')).toBe(false);
  });

  test('validates rc versions', () => {
    expect(matchVersion('1.2.3-rc.10', '1.2.3-rc.10')).toBe(true);
  });
});

declare global {
  var _WORKLETS_VERSION_CPP: string | undefined;
}
