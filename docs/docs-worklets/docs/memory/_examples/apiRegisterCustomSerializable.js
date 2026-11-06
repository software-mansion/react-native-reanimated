import {
  createWorkletRuntime,
  registerCustomSerializable,
  scheduleOnRuntime,
} from '@site/src/simulation/worklets';

function createPoint(x, y) {
  'worklet';
  const prototype = {
    kind: 'Point',
    length() {
      return Math.hypot(this.x, this.y);
    },
  };
  return Object.assign(Object.create(prototype), { x, y });
}

export function* showPoint(point) {
  'worklet';
  yield console.log('Distance:', point.length()); // 5
}

export default function* main() {
  yield registerCustomSerializable({
    name: 'Point',
    determine(value) {
      'worklet';
      const matches = Object.getPrototypeOf(value)?.kind === 'Point';
      console.log('determine:', matches);
      return matches;
    },
    pack(point) {
      'worklet';
      console.log('pack:', point.x, point.y);
      return { x: point.x, y: point.y };
    },
    unpack(data) {
      'worklet';
      console.log('unpack:', data.x, data.y);
      return createPoint(data.x, data.y);
    },
  });

  const worker = yield createWorkletRuntime({ name: 'background' });
  const point = yield createPoint(3, 4);
  yield scheduleOnRuntime(worker, showPoint, point);
}
