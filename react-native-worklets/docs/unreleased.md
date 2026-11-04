# About

React Native Worklets is a library that runs JavaScript code on more than one thread in a React
Native app.

By default, React Native executes all of your JavaScript on one thread, the JS thread, in one
JavaScript runtime. Rendering, layout, touch handling, network callbacks and your business logic all
wait in the same queue. A long task on the JS thread delays everything that comes after it, and the
app stops responding until the task ends.

Worklets adds more JavaScript runtimes to your app:

* The **UI Runtime** runs on the UI (main) thread. Code on it can respond to every frame and every
  touch without waiting for the JS thread.
* **Worker Runtimes** run on their own background threads. You create them for work that must not
  block either the JS thread or the UI thread.

Each runtime has its own JavaScript heap, so runtimes do not share JavaScript objects. A
[worklet function](https://docs.swmansion.com/react-native-worklets/docs/unreleased/tutorials/concurrency-model#worklet-functions) is a function that the
[Worklets plugin](https://docs.swmansion.com/react-native-worklets/docs/unreleased/worklets-plugin/about) prepares at build time, so that you can copy it to
another runtime and run it there. To move data between runtimes, Worklets gives you
[Serializables](https://docs.swmansion.com/react-native-worklets/docs/unreleased/memory/serializable), [Shareables](https://docs.swmansion.com/react-native-worklets/docs/unreleased/memory/shareable) and
[Synchronizables](https://docs.swmansion.com/react-native-worklets/docs/unreleased/memory/synchronizable).

The example below runs the same app in two ways: with all of its work on the JS thread, and with
the work distributed across runtimes. Use the **Enable Worklets** switch to compare them:

Without Worklets

```js
import {
  applyEqualizer,
  applyTheme,
  decodeAudio,
  fetchFromBackend,
  layoutBlocks,
  mixChannels,
  parseMarkdown,
  playAudio,
  renderHtml,
  resolveLinks,
} from './mocks';

function refreshFeed(page) {
  const posts = fetchFromBackend(`/feed?page=${page}`);
  setNativeProps('feed', { posts: posts.items });
  console.log(`feed page ${page} ready`);
  setTimeout(() => refreshFeed(page + 1), 8);
}

function animateSpinner(angle) {
  setNativeProps('spinner', { rotation: angle });
  console.log(`spinner at ${angle}deg`);
  requestAnimationFrame(() => animateSpinner(angle + 16));
}

function streamAudio(chunk) {
  const buffer = decodeAudio(chunk);
  const equalized = applyEqualizer(buffer);
  const mixed = mixChannels(equalized);
  setNativeProps('speaker', { pulse: playAudio(mixed) });
  console.log(`chunk ${chunk} played`);
  setTimeout(() => streamAudio(chunk + 1), 32);
}

function renderMarkdown(doc, revision) {
  const ast = parseMarkdown(doc, revision);
  const linked = resolveLinks(ast);
  const blocks = layoutBlocks(linked);
  const styled = applyTheme(blocks);
  setNativeProps('article', renderHtml(styled));
  console.log(`rendered ${doc} r${revision}`);
  setTimeout(() => renderMarkdown(doc, revision + 1), 16);
}

function onPress(count) {
  console.log(`press #${count}`);
  renderUI(count);
}

streamAudio(1);
renderMarkdown('README.md', 1);
animateSpinner(0);
refreshFeed(1);
```

With Worklets

```js
import {
  createWorkletRuntime,
  scheduleOnRuntime,
  scheduleOnUI,
} from 'react-native-worklets';
import {
  applyEqualizer,
  applyTheme,
  decodeAudio,
  fetchFromBackend,
  layoutBlocks,
  mixChannels,
  parseMarkdown,
  playAudio,
  renderHtml,
  resolveLinks,
} from './mocks';

function refreshFeed(page) {
  const posts = fetchFromBackend(`/feed?page=${page}`);
  setNativeProps('feed', { posts: posts.items });
  console.log(`feed page ${page} ready`);
  setTimeout(() => refreshFeed(page + 1), 8);
}

function animateSpinner(angle) {
  setNativeProps('spinner', { rotation: angle });
  console.log(`spinner at ${angle}deg`);
  requestAnimationFrame(() => animateSpinner(angle + 16));
}

function streamAudio(chunk) {
  const buffer = decodeAudio(chunk);
  const equalized = applyEqualizer(buffer);
  const mixed = mixChannels(equalized);
  setNativeProps('speaker', { pulse: playAudio(mixed) });
  console.log(`chunk ${chunk} played`);
  setTimeout(() => streamAudio(chunk + 1), 24);
}

function renderMarkdown(doc, revision) {
  const ast = parseMarkdown(doc, revision);
  const linked = resolveLinks(ast);
  const blocks = layoutBlocks(linked);
  const styled = applyTheme(blocks);
  setNativeProps('article', renderHtml(styled));
  console.log(`rendered ${doc} r${revision}`);
  setTimeout(() => renderMarkdown(doc, revision + 1), 16);
}

function onPress(count) {
  console.log(`press #${count}`);
  renderUI(count);
}

const audio = createWorkletRuntime({ name: 'audio' });
const md = createWorkletRuntime({ name: 'markdown' });
scheduleOnRuntime(audio, streamAudio, 1);
scheduleOnRuntime(md, renderMarkdown, 'README.md', 1);
scheduleOnUI(animateSpinner, 0);
refreshFeed(1);
```
