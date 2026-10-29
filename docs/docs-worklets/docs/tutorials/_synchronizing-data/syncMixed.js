import {
  UIRuntimeId,
  createShareable,
  createSynchronizable,
  requestAnimationFrame,
  scheduleOnUI,
  setInterval,
} from '@site/src/simulation/worklets';

export default function* main() {
  const progress = yield createShareable(UIRuntimeId, 0);
  const dirty = yield createSynchronizable(false);
  let cached = yield 0;

  function* onFrame(frame) {
    progress.value = yield frame * 25;
    yield dirty.setDirty(true);
    if (frame < 4) requestAnimationFrame(() => onFrame(frame + 1));
  }

  function* animate() {
    yield scheduleOnUI(onFrame, 0);
  }

  function* refresh() {
    cached = yield progress.getSync();
    yield dirty.setDirty(false);
    return yield cached;
  }

  // Read the progress on the RN Runtime once in a while
  function* read() {
    const changed = yield dirty.getDirty();
    const value = yield changed ? refresh() : cached;
    yield console.log(`progress ${value}%${changed ? '' : ' (cached)'}`);
  }

  yield animate();
  yield setInterval(animate, 160);
  yield setInterval(read, 24);
}
