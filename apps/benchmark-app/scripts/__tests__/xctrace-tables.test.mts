import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

import { child, childText, parseTraceTables } from '../xctrace-tables.mts';
import type { TraceElement } from '../xctrace-tables.mts';

// Cuts of the exports of xctrace 27.2 (27B52) of an iPhone 13 mini with iOS
// 27.0.1, with all cells of the rows that they keep.
const FIXTURES = path.join(import.meta.dirname, 'fixtures', 'xctrace');

function fixture(name: string): string {
  return fs.readFileSync(path.join(FIXTURES, `${name}.xml`), 'utf8');
}

function exportOf(...nodes: string[]): string {
  return `<?xml version="1.0"?>\n<trace-query-result>\n${nodes.join('\n')}\n</trace-query-result>\n`;
}

function node(schema: string, columns: string[], rows: string[]): string {
  const cols = columns
    .map((column) => `<col><mnemonic>${column}</mnemonic></col>`)
    .join('');
  return `<node xpath='//x'><schema name="${schema}">${cols}</schema>${rows.join('\n')}</node>`;
}

function onlyTable(xml: string) {
  const [table, ...others] = parseTraceTables(xml);
  assert.equal(others.length, 0);
  return table;
}

function cell(element: TraceElement | null | undefined): TraceElement {
  return element ?? assert.fail('the cell has no value');
}

describe('parseTraceTables', () => {
  it('reads the tables of a real export with their mnemonics and row counts', () => {
    for (const [name, rowCount] of [
      ['thread-state', 3],
      ['hitches-updates', 4],
      ['hitches', 1],
      ['device-thermal-state-intervals', 1],
      ['os-signpost', 2],
    ] as const) {
      const table = onlyTable(fixture(name));
      assert.equal(table.schema, name);
      assert.equal(table.rows.length, rowCount);
    }
    const [first] = onlyTable(fixture('thread-state')).rows;
    assert.deepEqual(Object.keys(first).slice(0, 6), [
      'start',
      'thread',
      'state',
      'duration',
      'process',
      'core',
    ]);
    assert.equal(cell(first.start).text, '0');
    assert.equal(cell(first.state).text, 'Blocked');
    assert.equal(cell(first.duration).text, '648399416');
    assert.equal(childText(cell(first.thread), 'tid'), '3840257');
  });

  it('replaces each ref with the element of its id, also inside a cell', () => {
    const [first, second, third] = onlyTable(fixture('thread-state')).rows;
    assert.equal(second.start, first.start);
    assert.equal(second.process, first.process);
    assert.equal(child(cell(second.thread), 'process'), first.process);
    assert.equal(childText(cell(second.thread), 'tid'), '3840258');
    assert.equal(childText(cell(cell(second.process)), 'pid'), '8865');
    const narrative = cell(third.summary);
    assert.equal(child(narrative, 'thread-state'), first.state);
    assert.equal(childText(narrative, 'sched-priority'), '47');
  });

  it('gives null for a sentinel cell', () => {
    const [first] = onlyTable(fixture('thread-state')).rows;
    assert.equal(first.core, null);
    assert.equal(first.cputime, null);
  });

  it('decodes the entities of text and attributes and keeps fmt apart from the text', () => {
    const mount = onlyTable(fixture('os-signpost')).rows.find(
      (row) =>
        row.message?.attributes.fmt ===
        'RCTPerformMountInstructions begin: <private>'
    );
    assert.equal(
      cell(mount?.message).children[0].text,
      'RCTPerformMountInstructions'
    );
    const state = onlyTable(fixture('os-signpost')).rows.find(
      (row) => row.name?.text === 'State'
    );
    const footprint = cell(state?.message).children[1];
    assert.equal(footprint.attributes.fmt, '40.993');
    assert.equal(footprint.text, '40993');
    const table = onlyTable(
      exportOf(
        node(
          'entities',
          ['text'],
          [
            `<row><string fmt='&quot;a&apos; &amp; &lt;b&gt;'>&lt;&gt;&amp;&quot;&apos;&#65;&#x42;&#x1F600;</string></row>`,
          ]
        )
      )
    );
    const text = cell(table.rows[0].text);
    assert.equal(text.attributes.fmt, `"a' & <b>`);
    assert.equal(text.text, `<>&"'AB\u{1F600}`);
  });

  it('keeps the text of an element but drops whitespace between its children', () => {
    const table = onlyTable(
      exportOf(
        node(
          'texts',
          ['mixed', 'space', 'empty'],
          ['<row>\n  <m> x <b/> <c/> y </m>\n  <s> </s>\n  <e></e>\n</row>']
        )
      )
    );
    const [row] = table.rows;
    assert.equal(cell(row.mixed).text, ' x  y ');
    assert.deepEqual(
      cell(row.mixed).children.map((each) => each.name),
      ['b', 'c']
    );
    assert.equal(cell(row.space).text, ' ');
    assert.equal(cell(row.empty).text, '');
  });

  it('reads several nodes and skips a node without a schema', () => {
    const tables = parseTraceTables(
      exportOf(
        node('first', ['a'], ['<row><x id="1">1</x></row>']),
        "<node xpath='//empty'></node>",
        node('second', ['a', 'b'], ['<row><x ref="1"/><sentinel/></row>'])
      )
    );
    assert.deepEqual(
      tables.map((table) => [table.schema, table.rows.length]),
      [
        ['first', 1],
        ['second', 1],
      ]
    );
    assert.equal(tables[1].rows[0].a, tables[0].rows[0].a);
    assert.equal(tables[1].rows[0].b, null);
    assert.deepEqual(parseTraceTables(exportOf()), []);
  });

  it('reads a large export without recursion over rows or nesting', () => {
    const rows = Array.from(
      { length: 200000 },
      (_, i) => `<row><n id="${i + 1}">${i}</n><n ref="1"/></row>`
    );
    const table = onlyTable(exportOf(node('large', ['a', 'b'], rows)));
    assert.equal(table.rows.length, 200000);
    assert.equal(cell(table.rows[199999].a).text, '199999');
    assert.equal(table.rows[199999].b, table.rows[0].a);
    const depth = 100000;
    const deep = `<row>${'<d>'.repeat(depth)}${'</d>'.repeat(depth)}</row>`;
    assert.equal(
      onlyTable(exportOf(node('deep', ['d'], [deep]))).rows.length,
      1
    );
  });

  it('stops on a row whose cell count is not the column count', () => {
    assert.throws(
      () =>
        parseTraceTables(
          exportOf(node('short', ['a', 'b'], ['<row><x/></row>']))
        ),
      /Row 1 of the table short has 1 cells, expected 2/
    );
  });

  it('stops on a root element that is not trace-query-result', () => {
    assert.throws(
      () => parseTraceTables('<trace-toc></trace-toc>'),
      /root element <trace-toc>, expected <trace-query-result>/
    );
  });

  it('stops on a ref to an unknown id', () => {
    assert.throws(
      () =>
        parseTraceTables(
          exportOf(node('refs', ['a'], ['<row><x ref="7"/></row>']))
        ),
      /not valid XML at line 3, column \d+: ref="7" names no earlier id/
    );
  });

  it('stops on malformed XML and names the position', () => {
    for (const [xml, problem] of [
      [
        '<trace-query-result>\n  <node>',
        /line 2, column 9: the element <node> has no end tag/,
      ],
      [
        '<trace-query-result>\n<a></b>',
        /line 2, column 4: the end tag <\/b> does not close <a>/,
      ],
      ['<trace-query-result><a x=1/>', /line 1, column 23: a bad tag <a>/],
      ['<trace-query-result><a x="<"/>', /a bad tag <a>/],
      [
        '<trace-query-result>&nbsp;</trace-query-result>',
        /line 1, column 21: the unknown entity &nbsp;/,
      ],
      [
        '<trace-query-result>a & b</trace-query-result>',
        /line 1, column 23: a "&" that starts no entity/,
      ],
      [
        '<trace-query-result>&#x110000;</trace-query-result>',
        /the entity &#x110000; names no character/,
      ],
      [
        'text<trace-query-result/>',
        /line 1, column 1: text outside the root element/,
      ],
      [
        '<trace-query-result/><trace-query-result/>',
        /a second root element <trace-query-result>/,
      ],
      [
        '<trace-query-result><!-- x --></trace-query-result>',
        /comments, CDATA and DOCTYPE are not supported/,
      ],
      ['<?xml version="1.0"', /the declaration has no end/],
      ['<trace-query-result></ >', /a bad end tag/],
      ['<trace-query-result>< a/>', /a bad tag name/],
      ['', /no root element/],
    ] as const) {
      assert.throws(
        () => parseTraceTables(xml),
        (error: Error) => {
          assert.equal(error.name, 'ToolError');
          assert.match(
            error.message,
            /^The xctrace export is not valid XML at /
          );
          assert.match(error.message, problem);
          return true;
        }
      );
    }
  });
});
