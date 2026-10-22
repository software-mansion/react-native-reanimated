import {
  requestAnimationFrame,
  scheduleOnUI,
} from '@site/src/simulation/worklets';

export function* startFrames() {
  'worklet';
  let frame = yield 0;

  function* onFrame() {
    frame = yield frame + 1;
    yield console.log('UI frame:', frame);
    if (frame < 3) requestAnimationFrame(onFrame);
    yield;
  }

  yield requestAnimationFrame(onFrame);
}

export default function* main() {
  yield scheduleOnUI(startFrames);
}
