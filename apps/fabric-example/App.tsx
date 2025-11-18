import { createMMKV } from 'react-native-mmkv';
import { type HybridObject, NitroModules } from 'react-native-nitro-modules';
import type { BoxedHybridObject } from 'react-native-nitro-modules/lib/typescript/BoxedHybridObject';
import {
  createSerializable,
  createWorkletRuntime,
  registerCustomSerializable,
  scheduleOnRN,
  scheduleOnRuntime,
  scheduleOnUI,
  serializableMappingCache,
} from 'react-native-worklets';

const boxedNitroModules = NitroModules.box(NitroModules);

const NitroModulesHandle = {
  __init() {
    'worklet';
    return boxedNitroModules.unbox();
  },
};

const serializedNitroModulesHandle = createSerializable(NitroModulesHandle);
serializableMappingCache.set(NitroModules, serializedNitroModulesHandle);

const determinant = (value: object) => {
  'worklet';
  return NitroModules.isHybridObject(value);
};

const serializer = (value: HybridObject<never>) => {
  'worklet';
  return NitroModules.box(value);
};

const deserializer = (value: BoxedHybridObject<HybridObject<never>>) => {
  'worklet';
  return value.unbox();
};

registerCustomSerializable({
  name: 'nitro::HybridObject',
  determinant,
  serializer,
  deserializer,
});

const storage = createMMKV();

storage.set('key', 2137);

NitroModules.box(storage);

function print(store: typeof storage) {
  console.log('type on JS', store.__type);
  console.log('value on JS', store.getNumber('key'));
  console.log('storage.__type on JS', storage.__type);
}

scheduleOnUI(() => {
  'worklet';

  console.log('type on UI', storage.__type);
  console.log('value on UI', storage.getNumber('key'));
  console.log('storage.__type on UI', storage.__type);

  scheduleOnRN(print, storage);
});

const runtime = createWorkletRuntime();

scheduleOnRuntime(runtime, () => {
  'worklet';

  console.log('type on custom runtime', storage.__type);
  console.log('value on custom runtime', storage.getNumber('key'));
  console.log('storage.__type on custom runtime', storage.__type);

  scheduleOnRN(print, storage);
});

export default function App() {
  return null;
}
