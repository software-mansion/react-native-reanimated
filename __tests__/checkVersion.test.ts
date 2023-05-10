import {
  checkCppVersion,
  matchVersion,
} from '../src/reanimated2/platform-specific/checkCppVersion';
const { version: packageVersion } = require('../package.json');

describe('checkCppVersion', () => {
  let spyOnConsoleError: jest.SpyInstance;

  beforeEach(() => {
    global._REANIMATED_VERSION_CPP = packageVersion;
    spyOnConsoleError = jest
      .spyOn(console, 'error')
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      .mockImplementation(() => {});
  });

  afterEach(() => {
    delete global._REANIMATED_VERSION_CPP;
    spyOnConsoleError.mockRestore();
  });

  it('checks version successfully', () => {
    checkCppVersion();
    expect(console.error).not.toHaveBeenCalled();
  });

  it('throws error when version is undefined', () => {
    delete global._REANIMATED_VERSION_CPP;
    checkCppVersion();
    expect(console.error).toHaveBeenCalled();
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
