import { version as packageVersion } from '../package.json';
import {
  checkCppVersion,
  matchVersion,
} from '../src/platform-specific/checkCppVersion';

describe('checkCppVersion', () => {
  beforeEach(() => {
    global._REANIMATED_VERSION_CPP = packageVersion;
  });

  afterEach(() => {
    delete global._REANIMATED_VERSION_CPP;
  });

  it('checks version successfully', () => {
    jest.spyOn(console, 'warn').mockImplementation();
    checkCppVersion();
    expect(console.warn).not.toBeCalled();
    jest.clearAllMocks();
  });

  it('throws error when version is undefined', () => {
    jest.spyOn(console, 'warn').mockImplementation();
    delete global._REANIMATED_VERSION_CPP;
    checkCppVersion();
    expect(console.warn).toBeCalled();
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
