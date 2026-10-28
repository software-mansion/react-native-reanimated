const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const markdownPlugin = require('./index');

const siteDir = path.resolve(__dirname, '../..');
const baseUrl = '/preview/worklets/';
const siteUrl = 'https://docs.example.com';

async function convertDoc(relative, permalink = `${baseUrl}docs/example`) {
  const convert = await markdownPlugin.createConverter();
  return convert({
    filePath: path.join(siteDir, relative),
    permalink,
    siteUrl,
    baseUrl,
  });
}

test('tutorial exports include every simulation as ordinary JavaScript with imports', async () => {
  const markdown = await convertDoc('docs/tutorials/1-your-first-worklet.mdx');
  assert.equal((markdown.match(/```js\n/g) ?? []).length, 4);
  assert.match(markdown, /from 'react-native-worklets'/);
  assert.match(markdown, /scheduleOnRuntime\(worker, logTid\)/);
  assert.match(markdown, /runOnRuntimeSync\(worker, logTid\)/);
  assert.doesNotMatch(markdown, /ThreadingSimulation|raw-loader|@site/);
  const examples = [...markdown.matchAll(/```js\n([\s\S]*?)\n```/g)]
    .map((match) => match[1])
    .join('\n');
  assert.doesNotMatch(examples, /function\*|\byield\b/);
  assert.match(
    markdown,
    /https:\/\/docs.example.com\/preview\/worklets\/docs\/concepts\/runtimeKinds#worklet-runtime/
  );
});

test('nested simulations and showcase variants keep their labels and examples', async () => {
  const memory = await convertDoc('docs/concepts/sharing-memory.mdx');
  assert.equal((memory.match(/```js\n/g) ?? []).length, 3);
  const showcase = await convertDoc('docs/getting-started/getting-started.mdx');
  assert.match(showcase, /Without Worklets\n\n```js/);
  assert.match(showcase, /With Worklets\n\n```js/);
  assert.doesNotMatch(showcase, /React Native Community CLI/);
  const installation = await convertDoc(
    'docs/getting-started/installation.mdx'
  );
  assert.match(installation, /React Native Community CLI/);
  assert.match(installation, /npm install react-native-worklets/);
  assert.match(installation, /yarn add react-native-worklets/);
  assert.doesNotMatch(installation, /Without Worklets|With Worklets/);
});

test('API exports retain call and platform support tables', async () => {
  const markdown = await convertDoc('docs/threading/runOnRuntimeAsync.mdx');
  assert.match(
    markdown,
    /Bundle Mode\s*\| Supported\s*\| Supported\s*\| Supported/
  );
  assert.match(
    markdown,
    /Legacy Eval Mode\s*\| Supported\s*\| Not supported\s*\| Not supported/
  );
  assert.match(markdown, /\| Supported\s*\| Not supported\s*\|/);
  assert.match(markdown, /```js[\s\S]*runOnRuntimeAsync/);
});

test('admonitions keep their title and exported code', async () => {
  const markdown = await convertDoc('docs/tutorials/2-returning-results.mdx');
  assert.match(markdown, /> NOTE/);
  assert.match(markdown, /Synchronous calls stay on the calling thread/);
  assert.match(markdown, /const second = await result/);
  assert.doesNotMatch(markdown, /awaitPromise|TODO|ThreadingSimulation/);
});

test('relative source-file links use the resolved page URL', async () => {
  const convert = await markdownPlugin.createConverter();
  const markdown = await convert({
    filePath: path.join(siteDir, 'docs/worklets-plugin/options.mdx'),
    permalink: `${baseUrl}docs/worklets-plugin/options`,
    siteUrl,
    baseUrl,
    sourcePermalinks: new Map([
      [
        path.join(siteDir, 'docs/bundleMode/importForwarding.mdx'),
        `${baseUrl}docs/bundleMode/importForwarding`,
      ],
    ]),
  });
  assert.match(
    markdown,
    /\[import forwarding\]\(https:\/\/docs.example.com\/preview\/worklets\/docs\/bundleMode\/importForwarding\)/
  );
  assert.doesNotMatch(markdown, /importForwarding\.mdx/);
});

test('exports and index follow resolved routes, custom slugs, versions and baseUrl', async (t) => {
  const generatedFilesDir = await fs.mkdtemp(
    path.join(os.tmpdir(), 'worklets-markdown-')
  );
  t.after(() => fs.rm(generatedFilesDir, { recursive: true, force: true }));
  const plugin = await markdownPlugin({
    siteDir,
    generatedFilesDir,
    siteConfig: { title: 'Worklets', url: siteUrl, baseUrl },
  });
  const docs = [
    {
      source: '@site/docs/tutorials/1-your-first-worklet.mdx',
      title: 'Your first worklet function',
      permalink: `${baseUrl}docs/tutorials/your-first-worklet`,
      version: 'current',
    },
    {
      source: '@site/docs/getting-started/getting-started.mdx',
      title: 'Introduction',
      permalink: `${baseUrl}docs/`,
      version: 'current',
    },
    {
      source: '@site/docs/getting-started/installation.mdx',
      title: 'Installation',
      permalink: `${baseUrl}docs/getting-started/installation`,
      version: 'current',
    },
    {
      source: '@site/docs/api/threading.mdx',
      title: 'Threading',
      permalink: `${baseUrl}docs/category/threading`,
      version: 'current',
    },
    {
      source: '@site/versioned_docs/version-0.9/threading/scheduleOnUI.mdx',
      title: 'scheduleOnUI',
      permalink: `${baseUrl}docs/0.9/threading/scheduleOnUI`,
      version: '0.9',
    },
  ];
  await plugin.allContentLoaded({
    allContent: {
      'docusaurus-plugin-content-docs': {
        default: { loadedVersions: [{ docs }] },
      },
    },
  });
  const outDir = path.join(generatedFilesDir, 'output');
  await plugin.postBuild({ outDir });
  const index = await fs.readFile(path.join(outDir, 'llms.txt'), 'utf8');
  assert.match(
    index,
    /\[Your first worklet function\]\(https:\/\/docs.example.com\/preview\/worklets\/docs\/tutorials\/your-first-worklet\)/
  );
  assert.match(index, /\/docs\/category\/threading/);
  assert.doesNotMatch(
    index,
    /1-your-first-worklet|getting-started\/getting-started|\/0.9\//
  );
  for (const doc of docs) {
    const exported = await fs.readFile(
      path.join(outDir, `${doc.permalink.slice(baseUrl.length)}.md`),
      'utf8'
    );
    assert.ok(exported.startsWith(`# ${doc.title}\n`));
  }
  const full = await fs.readFile(path.join(outDir, 'llms-full.txt'), 'utf8');
  assert.match(full, /scheduleOnRuntime\(worker, logTid\)/);
  assert.deepEqual(markdownPlugin.markdownPaths(`${baseUrl}docs/`, baseUrl), [
    'docs/.md',
    'docs.md',
  ]);
});
