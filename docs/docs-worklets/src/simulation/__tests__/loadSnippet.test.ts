import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { SnippetError } from '../errors';
import { loadSnippet } from '../loadSnippet';
import { asModule, unindent } from './helpers';

describe('loadSnippet', () => {
  it('requires a default generator export', () => {
    assert.throws(
      () => loadSnippet(asModule({}), ''),
      (error: unknown) =>
        error instanceof SnippetError && /default export/.test(error.message)
    );
  });

  it('rejects exports that are not generator functions', () => {
    function* main() {
      yield 1;
    }
    assert.throws(
      () =>
        loadSnippet(
          asModule({ default: main, helper: () => 1 }),
          'export default function* main() {\n  yield 1;\n}\n'
        ),
      (error: unknown) =>
        error instanceof SnippetError && /"helper"/.test(error.message)
    );
  });

  it('rejects functions missing from the source', () => {
    function* main() {
      yield 1;
    }
    function* helper() {
      yield 1;
    }
    assert.throws(
      () =>
        loadSnippet(
          asModule({ default: main, helper }),
          'export default function* main() {\n  yield 1;\n}\n'
        ),
      (error: unknown) =>
        error instanceof SnippetError && /"helper"/.test(error.message)
    );
  });

  it('links exports to their source info and prototypes', () => {
    function* helper() {
      yield 1;
    }
    function* main() {
      yield helper();
    }
    const snippet = loadSnippet(
      asModule({ default: main, helper }),
      unindent(`
        export function* helper() {
          yield 1;
        }

        export default function* main() {
          yield helper();
        }
      `)
    );
    assert.equal(snippet.main, main);
    assert.deepEqual(snippet.fnInfo.get(helper)?.yieldLines, [2]);
    assert.equal(
      snippet.protoToFn.get(Object.getPrototypeOf(helper())),
      helper
    );
  });
});
