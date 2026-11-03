import {
  requestAnimationFrame,
  scheduleOnUI,
  setImmediate,
  setTimeout,
} from '@site/src/simulation/worklets';

export function* firstFrameCallback() {
  yield console.log('requestAnimationFrame 1');
}

export function* immediateCallback() {
  yield console.log('setImmediate');
}

export function* timeoutCallback() {
  yield console.log('setTimeout');
}

export function* secondFrameCallback() {
  yield console.log('requestAnimationFrame 2');
}

export function* scheduleCallbacks() {
  yield requestAnimationFrame(firstFrameCallback);
  yield setImmediate(immediateCallback);
  yield setTimeout(timeoutCallback, 0);
  yield requestAnimationFrame(secondFrameCallback);
}

export default function* main() {
  yield scheduleOnUI(scheduleCallbacks);
}
