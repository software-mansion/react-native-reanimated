import {
  createWorkletRuntime,
  scheduleOnRuntime,
  scheduleOnUI,
  setTimeout,
  updateScreen,
} from '@site/src/simulation/worklets';
import {
  applyTransform,
  cacheHtml,
  decodeAudio,
  fetchFromBackend,
  formatPresses,
  parseMarkdown,
  playAudio,
  renderHtml,
  updateDb,
} from '@site/src/simulation/mocks';

export function* refreshFeed(page) {
  const posts = yield fetchFromBackend(`/feed?page=${page}`);
  yield updateDb(posts.items);
  yield console.log(`feed page ${page} ready`);
  yield setTimeout(() => refreshFeed(page + 1), 112);
}

export function* animateSpinner(angle) {
  yield applyTransform({ rotate: `${angle}deg` });
  yield console.log(`spinner at ${angle}deg`);
  yield setTimeout(() => animateSpinner(angle + 6), 32);
}

export function* streamAudio(chunk) {
  const buffer = yield decodeAudio(chunk);
  const samples = yield playAudio(buffer);
  yield console.log(`chunk ${chunk}: ${samples} samples`);
  yield setTimeout(() => streamAudio(chunk + 1), 32);
}

export function* renderMarkdown(doc) {
  const ast = yield parseMarkdown(doc);
  yield cacheHtml(doc, renderHtml(ast));
  yield console.log(`rendered ${doc}`);
  yield setTimeout(() => renderMarkdown(doc), 64);
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
  const markdown = yield createWorkletRuntime({ name: 'markdown' });
  yield scheduleOnRuntime(audio, streamAudio, 1);
  yield scheduleOnRuntime(markdown, renderMarkdown, 'README.md');
  yield scheduleOnUI(animateSpinner, 0);
  yield refreshFeed(1);
}
