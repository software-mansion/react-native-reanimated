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
  const needsSync = yield createSynchronizable(false, { fixedType: true });
  let cached = yield 0;

  function* onFrame(frame) {
    progress.value = yield frame * 25;
    yield needsSync.setDirty(true);
    if (yield frame < 4) {
      yield requestAnimationFrame(() => onFrame(frame + 1));
    }
  }

  function* restartAnimation() {
    yield scheduleOnUI(onFrame, 0);
  }

  function* refresh() {
    cached = yield progress.getSync();
    yield needsSync.setDirty(false);
    return yield cached;
  }

  function* synchronize() {
    const changed = yield needsSync.getDirty();
    const value = yield changed ? refresh() : cached;
    yield console.log(`progress ${value}%${changed ? '' : ' (cached)'}`);
  }

  yield restartAnimation();
  yield setInterval(restartAnimation, 160);
  yield setInterval(synchronize, 24); // Read the progress on the RN Runtime once in a while
}
