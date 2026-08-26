import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { JSDOM } from 'jsdom';

const directory = new URL('.', import.meta.url);

test('keeps the selected view and updates its opacity details across frames', async () => {
  const dom = new JSDOM(readFileSync(new URL('index.html', directory), 'utf8'), {
    runScripts: 'outside-only',
    url: 'http://127.0.0.1:4173/',
  });
  dom.window.HTMLElement.prototype.scrollIntoView = () => {};
  const scenario = {
    id: 'ios.LayoutAnimationScenariosTest.SharedTagMovesBetweenActiveBoundaries',
    platform: 'ios',
    suite: 'LayoutAnimationScenariosTest',
    name: 'SharedTagMovesBetweenActiveBoundaries',
  };
  const node = (opacity, x) => ({
    tag: 3,
    component: 'View',
    frame: { x, y: 5, width: 20, height: 20 },
    opacity,
    display: 'flex',
    zIndex: 0,
    children: [],
  });
  const root = (child) => ({
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
  });
  const result = {
    id: scenario.id,
    passed: true,
    duration: 2,
    output: 'passed',
    runs: [{
      mode: 'ios',
      frames: [
        { time: 10, transaction: 1, root: root(node(0.5, 5)), mutations: [] },
        {
          time: 20,
          transaction: 2,
          root: root(node(0.75, 6)),
          mutations: [{
            type: 'update',
            tag: 3,
            parentTag: 2,
            index: -1,
            before: { frame: { x: 5, y: 5, width: 20, height: 20 }, opacity: 0.5, zIndex: 0 },
            after: { frame: { x: 6, y: 5, width: 20, height: 20 }, opacity: 0.75, zIndex: 0 },
          }],
        },
      ],
    }],
  };
  dom.window.fetch = async (url) => ({
    ok: true,
    json: async () => url === '/api/tests'
        ? { buildDirectory: '/tmp/build', tests: [scenario] }
        : { results: [result] },
  });
  dom.window.eval(readFileSync(new URL('app.js', directory), 'utf8'));
  await settle();

  assert.equal(dom.window.document.querySelector('#total-count').textContent, '1');
  dom.window.document.querySelector('.test-row').click();
  dom.window.document.querySelector('#run-one').click();
  await settle();

  dom.window.document.querySelector('[data-view-tag="3"]').click();
  assert.deepEqual(details(dom), {
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

  dom.window.document.querySelector('#next-frame').click();
  assert.equal(dom.window.document.querySelector('[data-view-tag="3"]').ariaPressed, 'true');
  assert.equal(details(dom)['Absolute origin'], '16, 25');
  assert.equal(details(dom)['Local opacity'], '0.75');
  assert.equal(details(dom)['Effective opacity'], '0.38');
  assert.match(dom.window.document.querySelector('#mutations').textContent, /α 0.50→0.75/);
});

function details(dom) {
  return Object.fromEntries([...dom.window.document.querySelectorAll('#node-info div')].map((row) => [
    row.querySelector('dt').textContent,
    row.querySelector('dd').textContent,
  ]));
}

function settle() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}
