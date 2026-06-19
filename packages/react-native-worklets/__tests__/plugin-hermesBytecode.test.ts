import type { TransformOptions } from '@babel/core';
import { transformSync } from '@babel/core';
import { strict as assert } from 'assert';
import { html } from 'code-tag';

import type { PluginOptions } from '../plugin';
import plugin from '../plugin';

const FAKE_HERMESC = '/fake/hermesc';

const mockExecFileSync = jest.fn();

jest.mock('child_process', () => {
  const actual = jest.requireActual('child_process');
  return {
    ...actual,
    execFileSync: (...args: unknown[]) => mockExecFileSync(...args),
  };
});

function runPlugin(
  input: string,
  pluginOpts: PluginOptions = {},
  transformOpts: TransformOptions = {}
) {
  const strippedInput = input.replace(/<\/?script[^>]*>/g, '');
  const transformed = transformSync(strippedInput, {
    filename: '/dev/null',
    compact: false,
    babelrc: false,
    configFile: false,
    ...transformOpts,
    plugins: [[plugin, { getHBCBinary: () => FAKE_HERMESC, ...pluginOpts }]],
  });
  assert(transformed);
  return transformed;
}

describe('worklets babel plugin - hermesBytecode', () => {
  const originalBabelEnv = process.env.BABEL_ENV;

  beforeEach(() => {
    mockExecFileSync.mockReset();
    // hermesc writes the bytecode binary to stdout, which `execFileSync`
    // returns as a Buffer.
    mockExecFileSync.mockReturnValue(
      Buffer.from([0xc6, 0x1f, 0xbc, 0x03, 0x01, 0x02, 0x03])
    );
    // `isRelease` checks BABEL_ENV/NODE_ENV/envName for prod/release/staging.
    process.env.BABEL_ENV = 'production';
  });

  afterAll(() => {
    process.env.BABEL_ENV = originalBabelEnv;
  });

  // The compiler memoizes by worklet hash, so each test uses a unique body to
  // avoid sharing cached results across tests.
  const worklet = (marker: number) => html`<script>
    function foo() {
      'worklet';
      return ${String(marker)};
    }
  </script>`;

  test('emits worklet as a bytecode ArrayBuffer in release', () => {
    const { code } = runPlugin(worklet(1), { hermesBytecode: true });
    assert(code);
    expect(code).toContain('bytecode:');
    expect(code).toContain('new Uint8Array(');
    expect(code).toContain('.buffer');
    expect(code).not.toContain('code: "function');
    expect(mockExecFileSync).toHaveBeenCalledWith(
      FAKE_HERMESC,
      expect.arrayContaining(['-emit-binary', '-']),
      expect.objectContaining({ input: expect.stringContaining('function foo') })
    );
  });

  test('falls back to a source string when compilation fails', () => {
    mockExecFileSync.mockImplementation(() => {
      throw new Error('hermesc boom');
    });
    const { code } = runPlugin(worklet(2), { hermesBytecode: true });
    assert(code);
    expect(code).toContain('code: "function');
    expect(code).not.toContain('bytecode:');
  });

  test('falls back to a source string when getHBCBinary is not provided', () => {
    const { code } = runPlugin(worklet(5), {
      hermesBytecode: true,
      getHBCBinary: undefined,
    });
    assert(code);
    expect(code).toContain('code: "function');
    expect(code).not.toContain('bytecode:');
    expect(mockExecFileSync).not.toHaveBeenCalled();
  });

  test('does not emit bytecode when the option is disabled', () => {
    const { code } = runPlugin(worklet(3), { hermesBytecode: false });
    assert(code);
    expect(code).not.toContain('bytecode:');
    expect(mockExecFileSync).not.toHaveBeenCalled();
  });

  test('does not emit bytecode outside of release builds', () => {
    process.env.BABEL_ENV = 'development';
    const { code } = runPlugin(worklet(4), { hermesBytecode: true });
    assert(code);
    expect(code).not.toContain('bytecode:');
    expect(mockExecFileSync).not.toHaveBeenCalled();
  });
});
