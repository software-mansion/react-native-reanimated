const assert = require('node:assert/strict');
const { test } = require('node:test');
const {
  searchParameters,
  resultVersion,
  resultUrl,
  uniqueResults,
  resultText,
} = require('./utils');

const versions = [
  { name: 'current', label: '0.13' },
  { name: '0.10-0.12', label: '0.10-0.12' },
  { name: '0.9', label: '0.9' },
];
const root = 'https://docs.swmansion.com/react-native-worklets/docs/';

test('indexed formatting is removed without stripping TypeScript type parameters', () => {
  assert.equal(
    resultText(
      '<span class="algolia-docsearch-suggestion--highlight">Serializable</span><TValue>\u200b'
    ),
    'Serializable<TValue>'
  );
});

test('current search accepts crawler labels and internal names, without older versions', () => {
  assert.deepEqual(searchParameters(versions[0], 'en').facetFilters, [
    'language:en',
    [
      'docusaurus_tag:default',
      'docusaurus_tag:docs-default-current',
      'docusaurus_tag:docs-default-0.13',
    ],
  ]);
  assert.deepEqual(searchParameters(versions[1], 'en').facetFilters, [
    'language:en',
    ['docusaurus_tag:default', 'docusaurus_tag:docs-default-0.10-0.12'],
  ]);
});

test('version labels work for indexed hits and saved results without metadata', () => {
  assert.equal(
    resultVersion(
      { url: `${root}memory/serializable/`, version: ['0.13'] },
      versions
    ),
    '0.13'
  );
  assert.equal(
    resultVersion(
      { url: `${root}memory/serializable/`, version: ['current'] },
      versions
    ),
    '0.13'
  );
  assert.equal(
    resultVersion({ url: `${root}0.9/memory/serializable/` }, versions),
    '0.9'
  );
  assert.equal(
    resultVersion({ url: `${root}0.10-0.12/memory/serializable/` }, versions),
    '0.10-0.12'
  );
  assert.equal(
    resultVersion({ url: `${root}memory/serializable/` }, versions),
    '0.13'
  );
  assert.equal(
    resultVersion(
      { url: 'https://docs.swmansion.com/react-native-worklets/' },
      versions
    ),
    undefined
  );
});

test('result navigation preserves version, section and preview base path', () => {
  assert.equal(
    resultUrl(
      `${root}0.9/memory/serializable/#remarks`,
      '/react-native-worklets/'
    ),
    '/react-native-worklets/docs/0.9/memory/serializable/#remarks'
  );
  assert.equal(
    resultUrl(
      `${root}memory/serializable/#remarks`,
      '/react-native-worklets-next/'
    ),
    '/react-native-worklets-next/docs/memory/serializable/#remarks'
  );
});

test('deduplication removes identical destinations but preserves distinct sections and versions', () => {
  const hits = [
    { url: `${root}memory/serializable/` },
    { url: `${root}memory/serializable` },
    { url: `${root}memory/serializable/#remarks` },
    { url: `${root}0.9/memory/serializable/` },
  ];
  assert.deepEqual(uniqueResults(hits), [hits[0], hits[2], hits[3]]);
});
