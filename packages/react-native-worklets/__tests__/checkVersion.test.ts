import { version as packageVersion } from '../package.json';
import { logger } from '../src/logger';
import { checkCppVersion, matchVersion } from '../src/utils/checkCppVersion';

describe('checkCppVersion', () => {
  beforeEach(() => {
    globalThis._WORKLETS_VERSION_CPP = packageVersion;
  });

  afterEach(() => {
    delete globalThis._WORKLETS_VERSION_CPP;
  });

  it('checks version successfully', () => {
    jest.spyOn(logger, 'warn').mockImplementation();
    checkCppVersion();
    expect(logger.warn).not.toHaveBeenCalled();
    jest.clearAllMocks();
  });

  it('throws error when version is undefined', () => {
    jest.spyOn(logger, 'warn').mockImplementation();
    delete globalThis._WORKLETS_VERSION_CPP;
    checkCppVersion();
    expect(logger.warn).toHaveBeenCalled();
    jest.clearAllMocks();
  });
});

describe('matchVersion', () => {
  it('matches versions', () => {
    expect(matchVersion('1.2.3', '1.2.3')).toBe(true);
  });

  it('validates patch mismatch', () => {
    expect(matchVersion('1.2.3', '1.2.4')).toBe(true);
  });

  it('invalidates minor mismatch', () => {
    expect(matchVersion('1.2.3', '1.3.3')).toBe(false);
  });

  it('invalidates major mismatch', () => {
    expect(matchVersion('1.2.3', '2.2.3')).toBe(false);
  });

  it('validates rc versions', () => {
    expect(matchVersion('1.2.3-rc.10', '1.2.3-rc.10')).toBe(true);
  });
});
