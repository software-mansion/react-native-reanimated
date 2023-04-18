const {
  checkCppVersion,
} = require('../src/reanimated2/platform-specific/checkCppVersion');
const { version: packageVersion } = require('../package.json');

describe('checkCppVersion', () => {
  beforeEach(() => {
    global._REANIMATED_VERSION_CPP = packageVersion;
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    delete global._REANIMATED_VERSION_CPP;
    console.error.mockRestore();
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

  it('invalidates major mismatch', () => {
    global._REANIMATED_VERSION_CPP = packageVersion.replace(
      /^(\d+).(\d+).(\d+)$/,
      (match, major, minor, patch) => {
        return `${major + 1}.${minor}.${patch}`;
      }
    );
    checkCppVersion(global._REANIMATED_VERSION_CPP);
    expect(console.error).toHaveBeenCalled();
  });

  it('invalidates minor mismatch', () => {
    global._REANIMATED_VERSION_CPP = packageVersion.replace(
      /^(\d+).(\d+).(\d+)$/,
      (match, major, minor, patch) => {
        return `${major}.${minor + 1}.${patch}`;
      }
    );
    checkCppVersion();
    expect(console.error).toHaveBeenCalled();
  });

  it('validates patch mismatch', () => {
    global._REANIMATED_VERSION_CPP = packageVersion.replace(
      /^(\d+).(\d+).(\d+)$/,
      (match, major, minor, patch) => {
        return `${major}.${minor}.${patch + 1}`;
      }
    );
    checkCppVersion();
    expect(console.error).not.toHaveBeenCalled();
  });

  it('invalidates version post-string', () => {
    global._REANIMATED_VERSION_CPP = packageVersion + '-post';
    checkCppVersion();
    expect(console.error).toHaveBeenCalled();
  });
});
