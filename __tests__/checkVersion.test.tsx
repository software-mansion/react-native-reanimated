import {
  checkCppVersion,
  matchVersion,
} from '../src/reanimated2/platform-specific/checkCppVersion';
import { version as packageVersion } from '../package.json';

describe('checkCppVersion', () => {
  beforeEach(() => {
    global._REANIMATED_VERSION_CPP = packageVersion;
  });

  afterEach(() => {
    delete global._REANIMATED_VERSION_CPP;
  });

  it('checks version successfully', () => {
    expect(checkCppVersion).not.toThrow();
  });

  it('throws error when version is undefined', () => {
    delete global._REANIMATED_VERSION_CPP;
    expect(checkCppVersion).toThrow();
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
