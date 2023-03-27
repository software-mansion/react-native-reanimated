const {
  checkCppVersion,
} = require('../src/reanimated2/platform-specific/checkCppVersion');

const {
  checkPluginVersion,
} = require('../src/reanimated2/platform-specific/checkPluginVersion');

const {
  checkVersion,
} = require('../src/reanimated2/platform-specific/checkVersion');
const { version: packageVersion } = require('../package.json');

describe('desc', () => {
  beforeAll(() => {
    global._REANIMATED_VERSION_CPP = packageVersion;
    global._REANIMATED_VERSION_BABEL_PLUGIN = packageVersion;
    jest.spyOn(console, 'error');
  });

  afterAll(() => {
    delete global._REANIMATED_VERSION_CPP;
    console.error.mockRestore();
  });

  it('checks cpp version successfully', () => {
    checkCppVersion();
    expect(console.error).not.toHaveBeenCalled();
  });

  it('checks plugin version successfully', () => {
    checkPluginVersion();
    expect(console.error).not.toHaveBeenCalled();
  });

  it('checks all versions successfully', () => {
    checkVersion();
    expect(console.error).not.toHaveBeenCalled();
  });
});
