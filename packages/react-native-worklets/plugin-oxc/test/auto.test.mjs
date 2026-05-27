import test from 'node:test';
import assert from 'node:assert/strict';
import plugin from '../index.js';
const { transform } = plugin;

test('gesture handler callback is workletized', () => {
  const input = `
    const g = Gesture.Tap().onEnd((event) => {
      console.log(event);
    });
  `;
  const { code } = transform(input, 'test.js', {});
  assert.match(code, /__workletHash/, `expected workletization. Got:\n${code}`);
});

test('gesture handler chained methods all workletize', () => {
  const input = `
    const g = Gesture.Tap()
      .onStart((e) => { console.log('start'); })
      .onUpdate((e) => { console.log('update'); })
      .onEnd((e) => { console.log('end'); });
  `;
  const { code } = transform(input, 'test.js', {});
  const matches = code.match(/__workletHash/g) || [];
  assert.equal(matches.length, 3, `expected 3 worklets. Got:\n${code}`);
});

test('layout animation callback is workletized', () => {
  const input = `
    const a = BounceIn.withCallback((finished) => {
      console.log(finished);
    });
  `;
  const { code } = transform(input, 'test.js', {});
  assert.match(code, /__workletHash/, `expected workletization. Got:\n${code}`);
});

test('context object: explicit __workletContextObject marker turns obj into factory', () => {
  // Implicit context-object detection (this-using methods → factory) only
  // runs inside files with the file-level `'worklet'` directive in the babel
  // plugin. Outside that, only the explicit marker triggers conversion.
  const input = `
    const ctx = {
      __workletContextObject: true,
      counter: 0,
      bump() {
        this.counter += 1;
      },
    };
  `;
  const { code } = transform(input, 'test.js', {});
  assert.match(
    code,
    /__workletContextObjectFactory/,
    `expected context-object factory. Got:\n${code}`
  );
});

test('useAnimatedReaction workletizes both args', () => {
  const input = `
    useAnimatedReaction(() => x.value, (curr, prev) => { console.log(curr, prev); });
  `;
  const { code } = transform(input, 'test.js', {});
  const matches = code.match(/__workletHash/g) || [];
  assert.equal(matches.length, 2, `expected 2 worklets. Got:\n${code}`);
});

test('withDecay workletizes arg 1', () => {
  const input = `
    withDecay({ velocity: 1 }, (finished) => { console.log(finished); });
  `;
  const { code } = transform(input, 'test.js', {});
  assert.match(code, /__workletHash/, `Got:\n${code}`);
});
