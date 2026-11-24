import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import {
  bundleModeMetroConfig,
  getBundleModeMetroConfig,
} from '../../bundleMode';

const ORIGINAL_FILE = '/app/src/App.tsx';
const WORKLETS_DIR = path.resolve(__dirname, '..', '..', '.worklets');

const workletFileContent = `export default 1;\n//# workletSourceMap=${Buffer.from(
  JSON.stringify({
    version: 3,
    sources: [ORIGINAL_FILE],
    names: [],
    mappings: '',
  })
).toString('base64')}\n`;

const writtenFiles: string[] = [];

function writeWorkletFile(filePath: string) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, workletFileContent);
  writtenFiles.push(filePath);
  return filePath;
}

afterEach(() => {
  for (const filePath of writtenFiles.splice(0)) {
    fs.rmSync(filePath, { force: true });
  }
});

describe('bundle mode customizeFrame', () => {
  const { customizeFrame } = bundleModeMetroConfig.symbolicator;

  test('names the original file for a generated worklet file', () => {
    const file = writeWorkletFile(
      path.join(WORKLETS_DIR, 'customizeFrameTest.js')
    );

    expect(customizeFrame({ file })).toEqual({ file: ORIGINAL_FILE });
  });

  test('ignores a worklets directory of another package copy', () => {
    const file = writeWorkletFile(
      path.join(
        fs.mkdtempSync(path.join(os.tmpdir(), 'worklets-')),
        'react-native-worklets',
        '.worklets',
        'customizeFrameTest.js'
      )
    );

    expect(customizeFrame({ file })).toBeUndefined();
  });

  test('ignores paths that leave the worklets directory', () => {
    writeWorkletFile(path.join(WORKLETS_DIR, '..', 'customizeFrameTest.js'));

    expect(
      customizeFrame({
        file: path.join(WORKLETS_DIR, '..', 'customizeFrameTest.js'),
      })
    ).toBeUndefined();
    expect(
      customizeFrame({
        file: `${WORKLETS_DIR}/../customizeFrameTest.js`,
      })
    ).toBeUndefined();
  });

  test('keeps the fields of an existing customizeFrame', async () => {
    const file = writeWorkletFile(
      path.join(WORKLETS_DIR, 'customizeFrameTest.js')
    );
    const config = getBundleModeMetroConfig({
      serializer: {},
      resolver: {},
      symbolicator: { customizeFrame: () => ({ collapse: true }) },
    });

    await expect(config.symbolicator.customizeFrame({ file })).resolves.toEqual(
      { collapse: true, file: ORIGINAL_FILE }
    );
  });
});
