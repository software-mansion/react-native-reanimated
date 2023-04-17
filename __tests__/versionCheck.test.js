const {
  checkVersion,
} = require('../src/reanimated2/platform-specific/checkVersion');
const { version: packageVersion } = require('../package.json');

describe('desc', () => {
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
    checkVersion();
    expect(console.error).not.toHaveBeenCalled();
  });

  it('throws error when version is undefined', () => {
    delete global._REANIMATED_VERSION_CPP;
    checkVersion();
    expect(console.error).toHaveBeenCalled();
  });

  it('invalidates major mismatch', () => {
    global._REANIMATED_VERSION_CPP = packageVersion.replace(
      /^(\d+).(\d+).(\d+)$/,
      (match, major, minor, patch) => {
        console.log(match);
        return `${major + 1}.${minor}.${patch}`;
      }
    );
    checkVersion(global._REANIMATED_VERSION_CPP);
    expect(console.error).toHaveBeenCalled();
  });

  it('invalidates minor mismatch', () => {
    global._REANIMATED_VERSION_CPP = packageVersion.replace(
      /^(\d+).(\d+).(\d+)$/,
      (match, major, minor, patch) => {
        return `${major}.${minor + 1}.${patch}`;
      }
    );
    checkVersion();
    expect(console.error).toHaveBeenCalled();
  });

  it('validates patch mismatch', () => {
    global._REANIMATED_VERSION_CPP = packageVersion.replace(
      /^(\d+).(\d+).(\d+)$/,
      (match, major, minor, patch) => {
        return `${major}.${minor}.${patch + 1}`;
      }
    );
    checkVersion();
    expect(console.error).not.toHaveBeenCalled();
  });

  it('invalidates version post-string', () => {
    global._REANIMATED_VERSION_CPP = packageVersion + '-post';
    checkVersion();
    expect(console.error).toHaveBeenCalled();
  });
});
