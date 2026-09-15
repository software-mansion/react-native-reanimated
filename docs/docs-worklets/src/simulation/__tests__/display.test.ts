import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { displaySource } from '../display';
import { unindent } from './helpers';

const SNIPPETS_DIR = join(__dirname, '..', 'snippets');

describe('displaySource', () => {
  it('hides native and hidden functions and marks JSX blocks', () => {
    const source = readFileSync(
      join(SNIPPETS_DIR, 'reactNativeModel.jsx'),
      'utf8'
    );
    const { text, rawToDisplayLine, blockEnds } = displaySource(source);
    assert.equal(
      text,
      unindent(`
        function Counter() {
          const [count, setCount] = useState(0);

          useEffect(() => {
            const interval = setInterval(() => increment(setCount), 1000);
            return () => clearInterval(interval);
          }, []);

          return (
            <View>
              <Text>{count}</Text>
            </View>
          );
        }

        function increment(setCount) {
          setCount((count) => count + 1);
        }
      `)
    );
    assert.equal(rawToDisplayLine[19], 2);
    assert.equal(rawToDisplayLine[21], 4);
    assert.equal(rawToDisplayLine[26], 9);
    assert.equal(rawToDisplayLine[34], 17);
    assert.equal(rawToDisplayLine[37], -1);
    assert.deepEqual(
      [...blockEnds],
      [
        [4, 7],
        [9, 13],
      ]
    );
  });

  it('renders an empty yielding for loop as an empty loop', () => {
    const { text, rawToDisplayLine } = displaySource(
      unindent(`
        export function* busy() {
          for (let i = 0; i < 10; i++) {
            yield;
          }
        }
      `)
    );
    assert.equal(
      text,
      'function busy() {\n  for (let i = 0; i < 10; i++) {}\n}\n'
    );
    assert.equal(rawToDisplayLine[3], 2);
    assert.equal(rawToDisplayLine[4], 2);
  });

  it('strips yield from assignments', () => {
    const { text } = displaySource(
      'export default function* main() {\n  const w = yield create();\n}\n'
    );
    assert.equal(text, 'const w = create();\n');
  });

  it('renders the snippet as docs-style code', () => {
    const source = readFileSync(join(SNIPPETS_DIR, 'scheduleOnUI.js'), 'utf8');
    const display = displaySource(source);
    assert.equal(
      display.text,
      unindent(`
        function onDone(result) {
          console.log('RN got', result);
        }

        function compute() {
          'worklet';
          console.log('computing on UI');
          console.log('still computing on UI');
          scheduleOnRN(onDone, 42);
        }

        function continueOnRN() {
          console.log('RN keeps working');
          console.log('while UI computes');
        }

        scheduleOnUI(compute);
        scheduleOnRN(continueOnRN);
        console.log('RN continues');
      `)
    );
  });

  it('drops a multi-line import', () => {
    const { text, rawToDisplayLine } = displaySource(
      "import {\n  a,\n  b,\n} from '../worklets';\n\nexport default function* main() {\n  yield a();\n}\n"
    );
    assert.equal(text, 'a();\n');
    assert.deepEqual(rawToDisplayLine, [-1, -1, -1, -1, -1, -1, -1, 1, -1, 2]);
  });

  it('maps raw lines to display lines and marks dropped lines with -1', () => {
    const source = readFileSync(join(SNIPPETS_DIR, 'scheduleOnUI.js'), 'utf8');
    const { rawToDisplayLine } = displaySource(source);
    assert.equal(rawToDisplayLine[1], -1);
    assert.equal(rawToDisplayLine[2], -1);
    assert.equal(rawToDisplayLine[3], 1);
    assert.equal(rawToDisplayLine[4], 2);
    assert.equal(rawToDisplayLine[19], -1);
    assert.equal(rawToDisplayLine[20], 17);
    assert.equal(rawToDisplayLine[22], 19);
    assert.equal(rawToDisplayLine[23], -1);
  });
});
