import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { displaySource, simulate } from '..';
import { createSynchronizable } from '../worklets';
import { asModule, unindent } from './helpers';

describe('heap variable display rewrite', () => {
  it('rewrites only direct accesses outside strings and comments', () => {
    const source = unindent(`
      export default function* main() {
        const result = yield heapVariable('result', 0);
        yield console.log(result.value, other.result.value, 'result.value'); // result.value
      }
    `);
    const { text } = displaySource(source);
    assert.match(
      text,
      /^console\.log\(result, other\.result\.value, 'result\.value'\); \/\/ result\.value$/m
    );
  });
});

describe('fixed Synchronizable writes', () => {
  function* writesString() {
    const counter = yield createSynchronizable(0, { fixedType: true });
    yield counter.setDirty('ready' as unknown as number);
  }

  it('rejects a value of another type, as production does', () => {
    const snapshots = simulate(
      asModule({ default: writesString }),
      unindent(`
        export default function* main() {
          const counter = yield createSynchronizable(0, { fixedType: true });
          yield counter.setDirty('ready');
        }
      `)
    );
    const errors = snapshots
      .flatMap((snapshot) => snapshot.events)
      .filter((event) => event.type === 'error');
    assert.equal(errors.length, 1);
    assert.match(
      errors[0].type === 'error' ? errors[0].message : '',
      /Expected a number for a fixed-type Synchronizable/
    );
  });
});

describe('yielding if conditions', () => {
  it('displays `if (yield cond)` as a plain condition and executes its line', () => {
    const source = unindent(`
      export default function* main() {
        const frame = yield 1;
        if (yield frame < 4) {
          yield console.log('more');
        }
      }
    `);
    assert.match(displaySource(source).text, /^if \(frame < 4\) \{$/m);
    function* main() {
      const frame = yield 1;
      if (yield frame < 4) {
        yield console.log('more');
      }
    }
    const lines = simulate(asModule({ default: main }), source)
      .flatMap((snapshot) => snapshot.events)
      .flatMap((event) => (event.type === 'exec' ? [event.line] : []));
    assert.ok(lines.includes(3));
    assert.ok(lines.includes(4));
  });
});

describe('skipped branches', () => {
  it('does not report a skipped branch line as executed when the function returns', () => {
    const source = unindent(`
      export default function* main() {
        if (yield false) {
          yield console.log('never');
        }
      }
    `);
    function* main() {
      if (yield false) {
        yield console.log('never');
      }
    }
    const lines = simulate(asModule({ default: main }), source)
      .flatMap((snapshot) => snapshot.events)
      .flatMap((event) => (event.type === 'exec' ? [event.line] : []));
    assert.ok(lines.includes(2));
    assert.ok(!lines.includes(3));
    assert.ok(lines.includes(5));
  });
});

describe('exact executed lines', () => {
  it('reports the real line after a skipped branch in the middle of a function', () => {
    const path = join(__dirname, '_fixtures', 'skippedBranch.js');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const snapshots = simulate(require(path), readFileSync(path, 'utf8'));
    const events = snapshots.flatMap((snapshot) => snapshot.events);
    const lines = events.flatMap((event) =>
      event.type === 'exec' ? [event.line] : []
    );
    assert.ok(!lines.includes(4));
    assert.ok(lines.includes(6));
    const log = events.find((event) => event.type === 'log');
    assert.equal(log?.type === 'log' ? log.line : null, 6);
  });
});

describe('second review round', () => {
  it('rewrites heap variable accesses only inside the declaring function', () => {
    const source = unindent(`
      export default function* main() {
        function* first() {
          const result = yield heapVariable('result', 0);
          yield console.log(result.value);
        }
        function* second(result) {
          yield console.log(result.value);
        }
      }
    `);
    const { text } = displaySource(source);
    assert.match(text, /^\s{2}console\.log\(result\);$/m);
    assert.match(text, /^\s{2}console\.log\(result\.value\);$/m);
  });

  it('treats a yielded if header with a trailing comment as one statement', () => {
    const source = unindent(`
      export default function* main() {
        if (yield true) { // check
          yield console.log('inside');
        }
        yield console.log('after');
      }
    `);
    const { blockEnds } = displaySource(source);
    assert.equal([...blockEnds.keys()].includes(1), false);
  });

  it('passes plain objects with __block back to the snippet', () => {
    function* main() {
      const value = yield { __block: true };
      yield console.log(String(value.__block));
    }
    const snapshots = simulate(
      asModule({ default: main }),
      unindent(`
        export default function* main() {
          const value = yield { __block: true };
          yield console.log(String(value.__block));
        }
      `)
    );
    const events = snapshots.flatMap((snapshot) => snapshot.events);
    assert.equal(events.filter((event) => event.type === 'error').length, 0);
  });
});
