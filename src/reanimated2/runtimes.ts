import { valueUnpacker } from './initializers';

export type WorkletRuntime = {
  __hostObjectWorkletRuntime: true;
};

export function createWorkletRuntime(name: string) {
  // @ts-ignore valueUnpacker is a worklet
  const valueUnpackerCode = valueUnpacker.__initData.code;
  return global._createWorkletRuntime(name, valueUnpackerCode);
}
