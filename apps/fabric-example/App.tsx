// @ts-nocheck

import { createMMKV } from 'react-native-mmkv';
import { NitroModules } from 'react-native-nitro-modules';
import {
  createSerializable,
  registerSerializable,
  scheduleOnUI,
  serializableMappingCache,
  scheduleOnRN,
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

const determinant = (value) => {
  'worklet';
  if (value.__type != undefined) {
    console.log('determined');
  }
  return NitroModules.isHybridObject(value);
};

const serializer = (value) => {
  'worklet';
  console.log('serialized');
  // return boxedNitroModules.unbox().box(value);
  return NitroModules.box(value);
};

const deserializer = (value) => {
  'worklet';
  return value.unbox();
};

registerSerializable(determinant, serializer, deserializer);

const storage = createMMKV();

storage.set('key', 2137);

NitroModules.box(storage);

function print(store) {
  console.log('type on JS', store.__type);
  console.log('value on JS', store.getNumber('key'));
}

scheduleOnUI(() => {
  'worklet';
  console.log('type on UI', storage.__type);
  console.log('value on UI', storage.getNumber('key'));

  // scheduleOnRN(print, storage);
});

export default function App() {
  return null;
}
