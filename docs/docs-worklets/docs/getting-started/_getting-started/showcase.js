import {
  createWorkletRuntime,
  requestAnimationFrame,
  scheduleOnRuntime,
  scheduleOnUI,
  setNativeProps,
  setTimeout,
  updateScreen,
} from '@site/src/simulation/worklets';
import {
  applyEqualizer,
  applyTheme,
  decodeAudio,
  fetchFromBackend,
  formatPresses,
  layoutBlocks,
  mixChannels,
  parseMarkdown,
  playAudio,
  renderHtml,
  resolveLinks,
} from '@site/src/simulation/mocks';

export function* refreshFeed(page) {
  const posts = yield fetchFromBackend(`/feed?page=${page}`);
  yield setNativeProps('feed', { posts: posts.items });
  yield console.log(`feed page ${page} ready`);
  yield setTimeout(() => refreshFeed(page + 1), 8);
}

export function* animateSpinner(angle) {
  yield setNativeProps('spinner', { rotation: angle });
  yield console.log(`spinner at ${angle}deg`);
  yield requestAnimationFrame(() => animateSpinner(angle + 16));
}

export function* streamAudio(chunk) {
  const buffer = yield decodeAudio(chunk);
  const equalized = yield applyEqualizer(buffer);
  const mixed = yield mixChannels(equalized);
  yield setNativeProps('speaker', { pulse: playAudio(mixed) });
  yield console.log(`chunk ${chunk} played`);
  yield setTimeout(() => streamAudio(chunk + 1), 24);
}

export function* renderMarkdown(doc, revision) {
  const ast = yield parseMarkdown(doc, revision);
  const linked = yield resolveLinks(ast);
  const blocks = yield layoutBlocks(linked);
  const styled = yield applyTheme(blocks);
  yield setNativeProps('article', renderHtml(styled));
  yield console.log(`rendered ${doc} r${revision}`);
  yield setTimeout(() => renderMarkdown(doc, revision + 1), 16);
}

export function* onPress(count) {
  yield console.log(`press #${count}`);
  yield renderUI(count);
}

export function* renderUI(count) {
  'hidden';
  yield updateScreen({
    nativeProps: { counter: { text: formatPresses(count) } },
  });
}

export default function* main() {
  const audio = yield createWorkletRuntime({ name: 'audio' });
  const md = yield createWorkletRuntime({ name: 'markdown' });
  yield scheduleOnRuntime(audio, streamAudio, 1);
  yield scheduleOnRuntime(md, renderMarkdown, 'README.md', 1);
  yield scheduleOnUI(animateSpinner, 0);
  yield refreshFeed(1);
}
