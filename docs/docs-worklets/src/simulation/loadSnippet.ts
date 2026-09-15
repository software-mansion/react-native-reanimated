import { displaySource } from './display';
import { SnippetError } from './errors';
import { scanSource } from './scanSource';
import type { FnInfo, LoadedSnippet, SnippetFn, SnippetModule } from './types';

const MAIN_NAME = 'main';

export function loadSnippet(
  module: SnippetModule,
  source: string
): LoadedSnippet {
  const infoByName = scanSource(source);
  const fns = new Map<string, SnippetFn>();
  const fnInfo = new Map<SnippetFn, FnInfo>();
  const protoToFn = new Map<object, SnippetFn>();

  for (const [key, value] of Object.entries(module)) {
    if (key === '__esModule') {
      continue;
    }
    if (!isGeneratorFunction(value)) {
      throw new SnippetError(
        `export "${key}" is not a generator function; snippets may only export generator functions`
      );
    }
    const name = key === 'default' ? MAIN_NAME : key;
    const info = infoByName.get(name);
    if (info === undefined) {
      throw new SnippetError(`function "${name}" was not found in the source`);
    }
    fns.set(name, value);
    fnInfo.set(value, info);
    protoToFn.set(value.prototype as object, value);
  }

  const main = module.default;
  if (!isGeneratorFunction(main)) {
    throw new SnippetError(
      'a snippet must have a default export "main" that is a generator function'
    );
  }

  return { main, fns, fnInfo, protoToFn, display: displaySource(source) };
}

export function isGeneratorFunction(value: unknown): value is SnippetFn {
  return (
    typeof value === 'function' &&
    Object.prototype.toString.call(value) === '[object GeneratorFunction]'
  );
}

export function isGeneratorObject(
  value: unknown
): value is Generator<unknown, unknown, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    Object.prototype.toString.call(value) === '[object Generator]'
  );
}
