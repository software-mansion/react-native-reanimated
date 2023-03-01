const {
  checkVersion,
} = require('../src/reanimated2/platform-specific/checkVersion');
const { version: packageVersion } = require('../package.json');

describe('desc', () => {
  beforeAll(() => {
    global._REANIMATED_VERSION_CPP = packageVersion;
    jest.spyOn(console, 'error');
  });

  afterAll(() => {
    delete global._REANIMATED_VERSION_CPP;
    console.error.mockRestore();
  });

  it('checks version successfully', () => {
    checkVersion();
    expect(console.error).not.toHaveBeenCalled();
  });
});
