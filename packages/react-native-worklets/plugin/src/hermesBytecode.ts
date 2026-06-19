import { transformSync } from '@babel/core';
import { execFileSync } from 'child_process';

import type { WorkletsPluginPass } from './types';

// hermesc never emits more than a few MB of bytecode for a single worklet, but
// give `execFileSync` plenty of headroom so its stdout is never truncated.
const MAX_BYTECODE_BYTES = 256 * 1024 * 1024;

const compilationCache = new Map<number, Buffer | null>();
const warnedMessages = new Set<string>();

function warnOnce(message: string) {
  if (warnedMessages.has(message)) {
    return;
  }
  warnedMessages.add(message);
  // eslint-disable-next-line no-console
  console.warn(`[Worklets] ${message}`);
}

function resolveHbcBinary(state: WorkletsPluginPass): string | null {
  const getHBCBinary = state.opts.getHBCBinary;
  if (!getHBCBinary) {
    warnOnce(
      'The `getHBCBinary` plugin option is required to compile worklets to Hermes bytecode. Falling back to shipping worklets as source strings.'
    );
    return null;
  }
  try {
    const binary = getHBCBinary();
    if (!binary) {
      throw new Error('`getHBCBinary` returned an empty path.');
    }
    return binary;
  } catch (error) {
    warnOnce(
      `Calling \`getHBCBinary\` failed, falling back to a source string. ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return null;
  }
}

/**
 * Compiles a single worklet to Hermes bytecode (HBC). Returns the raw bytecode
 * buffer, or `null` if compilation is unavailable or fails — in which case the
 * caller should fall back to shipping the worklet as a source string.
 *
 * The source is wrapped in `(...)` so the script's completion value is the
 * worklet function, matching how the runtime evaluates the string form.
 */
export function compileWorkletToHbc(
  funString: string,
  workletHash: number,
  state: WorkletsPluginPass
): Buffer | null {
  if (compilationCache.has(workletHash)) {
    return compilationCache.get(workletHash)!;
  }

  const result = compile(funString, state);
  compilationCache.set(workletHash, result);
  return result;
}

function compile(funString: string, state: WorkletsPluginPass): Buffer | null {
  const hermesc = resolveHbcBinary(state);
  if (!hermesc) {
    return null;
  }

  const source = '(' + funString + '\n)';
  try {
    return runHermesc(hermesc, source);
  } catch (error) {
    // hermesc parses standard JS only, so worklets that still contain JSX
    // (extracted before the JSX transform ran) fail. Transform the JSX away
    // and retry once before giving up.
    if (errorStderr(error).includes('JSX')) {
      const transformed = transformJsx(source);
      if (transformed !== null) {
        try {
          return runHermesc(hermesc, transformed);
        } catch (retryError) {
          return warnFallback(retryError);
        }
      }
    }
    return warnFallback(error);
  }
}

function runHermesc(hermesc: string, source: string): Buffer {
  // hermesc reads the source from stdin (the `-` argument) and, with no
  // `-out`, writes the bytecode binary to stdout, which `execFileSync` returns
  // as a Buffer. This keeps the whole compilation in memory. stderr is piped
  // (not inherited) so compiler errors don't leak to the console — we surface
  // them through `warnOnce` instead.
  return execFileSync(hermesc, ['-emit-binary', '-O', '-w', '-'], {
    input: source,
    maxBuffer: MAX_BYTECODE_BYTES,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
}

function errorStderr(error: unknown): string {
  const stderr = (error as { stderr?: Buffer | string })?.stderr;
  if (stderr) {
    return stderr.toString();
  }
  return error instanceof Error ? error.message : String(error);
}

function warnFallback(error: unknown): null {
  const reason = errorStderr(error).trim().split('\n')[0];
  warnOnce(
    `Could not compile a worklet to Hermes bytecode, falling back to a source string. ${reason}`
  );
  return null;
}

let jsxPluginPath: string | null | undefined;

function resolveJsxPlugin(): string | null {
  if (jsxPluginPath === undefined) {
    try {
      jsxPluginPath = require.resolve('@babel/plugin-transform-react-jsx');
    } catch {
      jsxPluginPath = null;
    }
  }
  return jsxPluginPath;
}

// Transforms JSX in the source to plain `React.createElement` calls so hermesc
// can compile it. Returns `null` when the plugin is unavailable or the
// transform fails, leaving the caller to fall back to a source string.
function transformJsx(source: string): string | null {
  const plugin = resolveJsxPlugin();
  if (!plugin) {
    return null;
  }
  try {
    const result = transformSync(source, {
      babelrc: false,
      configFile: false,
      compact: true,
      plugins: [plugin],
    });
    return result?.code ?? null;
  } catch {
    return null;
  }
}
