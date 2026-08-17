import test from 'node:test';
import assert from 'node:assert/strict';
import plugin from '../index.js';
const { transform } = plugin;

function joinedFiles(files) {
  return files.map((f) => f.content).join('\n');
}

test('gesture handler callback is workletized', () => {
  const input = `
    const g = Gesture.Tap().onEnd((event) => {
      console.log(event);
    });
  `;
  const { files } = transform(input, 'test.js', {});
  assert.equal(files.length, 1);
  assert.match(joinedFiles(files), /__workletHash/);
});

test('gesture handler chained methods all workletize', () => {
  const input = `
    const g = Gesture.Tap()
      .onStart((e) => { console.log('start'); })
      .onUpdate((e) => { console.log('update'); })
      .onEnd((e) => { console.log('end'); });
  `;
  const { files } = transform(input, 'test.js', {});
  assert.equal(files.length, 3, `expected 3 worklets. Got files=${files.length}`);
});

test('layout animation callback is workletized', () => {
  const input = `
    const a = BounceIn.withCallback((finished) => {
      console.log(finished);
    });
  `;
  const { files } = transform(input, 'test.js', {});
  assert.equal(files.length, 1);
  assert.match(joinedFiles(files), /__workletHash/);
});

test('useAnimatedReaction workletizes both args', () => {
  const input = `
    useAnimatedReaction(() => x.value, (curr, prev) => { console.log(curr, prev); });
  `;
  const { files } = transform(input, 'test.js', {});
  assert.equal(files.length, 2, `expected 2 worklets. Got files=${files.length}`);
});

test('withDecay workletizes arg 1', () => {
  const input = `
    withDecay({ velocity: 1 }, (finished) => { console.log(finished); });
  `;
  const { files } = transform(input, 'test.js', {});
  assert.equal(files.length, 1);
  assert.match(joinedFiles(files), /__workletHash/);
});
