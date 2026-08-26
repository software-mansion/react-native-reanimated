import assert from 'node:assert/strict';
import test from 'node:test';

import { findNodeState, mutationLabel, nodeRows, resultStatus, testPurpose } from './model.js';

test('keeps selected-view opacity and geometry meaningful across frames', () => {
  const first = root(node(0.5, 5));
  const second = root(node(0.75, 6));
  const selectedTag = 3;

  assert.deepEqual(Object.fromEntries(nodeRows(findNodeState(first, selectedTag))), {
    Tag: '#3',
    Component: 'View',
    'Local origin': '5, 5',
    'Absolute origin': '15, 25',
    Size: '20 × 20',
    'Local opacity': '0.50',
    'Effective opacity': '0.25',
    Display: 'flex',
    'Z-index': '0',
    Children: '0',
  });
  assert.deepEqual(Object.fromEntries(nodeRows(findNodeState(second, selectedTag))), {
    Tag: '#3',
    Component: 'View',
    'Local origin': '6, 5',
    'Absolute origin': '16, 25',
    Size: '20 × 20',
    'Local opacity': '0.75',
    'Effective opacity': '0.38',
    Display: 'flex',
    'Z-index': '0',
    Children: '0',
  });

  assert.deepEqual(mutationLabel({
    type: 'update',
    tag: 3,
    parentTag: 2,
    index: -1,
    before: { frame: { x: 5, y: 5, width: 20, height: 20 }, opacity: 0.5, zIndex: 0 },
    after: { frame: { x: 6, y: 5, width: 20, height: 20 }, opacity: 0.75, zIndex: 0 },
  }), {
    text: 'update #3 · α 0.50→0.75',
    title: 'parent #2, index -1; frame 5,5 20×20 → 6,5 20×20',
  });
  assert.equal(Object.fromEntries(nodeRows(findNodeState(root(node(1, 0, 'none')), selectedTag))).Display, 'none');
  assert.equal(resultStatus({ passed: false, signal: 'SIGABRT' }), 'Crashed · SIGABRT');
  assert.equal(resultStatus({ passed: false, signal: 'SIGKILL', timedOut: true }), 'Timed out');
  assert.equal(resultStatus({ passed: false, signal: null }), 'Failed');
  assert.equal(testPurpose('LayoutAnimationCrashRegressionTest'), 'Historical crash regression');
  assert.equal(testPurpose('LayoutAnimationScenariosTest'), 'Behavior');
});

function node(opacity, x, display = 'flex') {
  return {
    tag: 3,
    component: 'View',
    frame: { x, y: 5, width: 20, height: 20 },
    opacity,
    display,
    zIndex: 0,
    children: [],
  };
}

function root(child) {
  return {
    tag: 1,
    component: 'RootView',
    frame: { x: 0, y: 0, width: 100, height: 100 },
    opacity: 1,
    display: 'flex',
    zIndex: 0,
    children: [{
      tag: 2,
      component: 'REASharedTransitionBoundary',
      frame: { x: 10, y: 20, width: 50, height: 50 },
      opacity: 0.5,
      display: 'contents',
      zIndex: 0,
      children: [child],
    }],
  };
}
