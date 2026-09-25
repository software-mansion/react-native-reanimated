import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { SnippetError } from '../errors';
import { scanSource } from '../scanSource';
import { unindent } from './helpers';

const SNIPPETS_DIR = join(__dirname, '..', 'snippets');

describe('scanSource', () => {
  it('records nested generator functions separately from their parent', () => {
    const fns = scanSource(
      unindent(`
        export default function* main() {
          let value = yield 1;
          function* inner() {
            yield value++;
          }
          yield inner;
        }
      `)
    );
    assert.deepEqual(fns.get('main')?.yieldLines, [2, 6]);
    assert.deepEqual(fns.get('inner')?.yieldLines, [4]);
    assert.equal(fns.get('inner')?.headerLine, 3);
    assert.equal(fns.get('inner')?.endLine, 5);
    assert.equal(fns.get('main')?.endLine, 7);
  });

  it('maps every function to its header and yield lines', () => {
    const source = readFileSync(join(SNIPPETS_DIR, 'scheduleOnUI.js'), 'utf8');
    const fns = scanSource(source);
    assert.deepEqual(
      [...fns.values()],
      [
        {
          name: 'onDone',
          headerLine: 3,
          endLine: 5,
          yieldLines: [4],
          yieldEnds: [4],
          isNative: false,
          isHidden: false,
          hasLoop: false,
        },
        {
          name: 'compute',
          headerLine: 7,
          endLine: 12,
          yieldLines: [9, 10, 11],
          yieldEnds: [9, 10, 11],
          isNative: false,
          isHidden: false,
          hasLoop: false,
        },
        {
          name: 'continueOnRN',
          headerLine: 14,
          endLine: 17,
          yieldLines: [15, 16],
          yieldEnds: [15, 16],
          isNative: false,
          isHidden: false,
          hasLoop: false,
        },
        {
          name: 'main',
          headerLine: 19,
          endLine: 23,
          yieldLines: [20, 21, 22],
          yieldEnds: [20, 21, 22],
          isNative: false,
          isHidden: false,
          hasLoop: false,
        },
      ]
    );
  });

  it('ignores braces inside strings and comments', () => {
    const fns = scanSource(
      unindent(`
        export function* main() {
          yield console.log('{ not a brace }'); // }
          yield console.log("}");
        }
      `)
    );
    assert.deepEqual(fns.get('main')?.yieldLines, [2, 3]);
    assert.equal(fns.get('main')?.endLine, 4);
  });

  it('counts yield expressions assigned to a variable', () => {
    const fns = scanSource(
      unindent(`
        export default function* main() {
          const worker = yield createWorkletRuntime({ name: 'w' });
          worker.count = yield 1;
          yield 2;
        }
      `)
    );
    assert.deepEqual(fns.get('main')?.yieldLines, [2, 3, 4]);
  });

  it('records the end of a multi-line yield statement', () => {
    const fns = scanSource(
      unindent(`
        export default function* main() {
          'hidden';
          return yield (
            <View>
              <Text>{count}</Text>
            </View>
          );
        }
      `)
    );
    assert.deepEqual(fns.get('main')?.yieldLines, [3]);
    assert.deepEqual(fns.get('main')?.yieldEnds, [7]);
    assert.equal(fns.get('main')?.isHidden, true);
  });

  it('rejects a yield outside of a function', () => {
    assert.throws(
      () => scanSource('yield 1;\n'),
      (error: unknown) => error instanceof SnippetError && error.line === 1
    );
  });

  it('rejects an unterminated function', () => {
    assert.throws(
      () => scanSource('export function* main() {\n  yield 1;\n'),
      (error: unknown) => error instanceof SnippetError && error.line === 1
    );
  });
});
