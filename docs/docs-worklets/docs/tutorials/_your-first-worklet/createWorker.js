import { createWorkletRuntime } from '@site/src/simulation/worklets';

export default function* main() {
  const worker = yield createWorkletRuntime({ name: 'background' });
}
