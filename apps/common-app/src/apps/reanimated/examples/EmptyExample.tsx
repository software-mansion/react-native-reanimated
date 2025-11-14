// import App from 'common-app';

// export default App;

import { createMMKV } from 'react-native-mmkv';
import { type HybridObject, NitroModules } from 'react-native-nitro-modules';
import { registerSerializable, scheduleOnUI } from 'react-native-worklets';

const storage = createMMKV();

storage.set('key', 2137);

// globalThis.__ENABLE_LOGGING = true;

NitroModules.box(storage);

const boxedNitroModules = NitroModules.box(NitroModules);

const determinant: any = (value: Record<string, unknown>) => {
  'worklet';
  if (value.__type != undefined) {
    console.log('determined');
  }
  return value.__type != undefined;
};

const serializer: any = (value: HybridObject<any>) => {
  'worklet';
  console.log('serialized');
  return boxedNitroModules.unbox().box(value);
};

const deserializer: any = (
  value: /* TODO: not exposed BoxedHybridObject<any> */ typeof boxedNitroModules
) => {
  'worklet';
  return value.unbox();
};

registerSerializable(determinant, serializer, deserializer);
// const SerializedNitroModules = createSerializable(
//   NitroModules
//   //   NitroModules.box(NitroModules)
// );
// globalThis.__ENABLE_LOGGING = false;

scheduleOnUI(() => {
  'worklet';
  console.log(storage.__type);
  console.log(storage.getNumber('key'));
  // console.log(storage.unbox);
  // console.log((storage as any).unbox() as typeof storage);
  // console.log(SerializedNitroModules);
  // console.log(SerializedNitroModules.getAllHybridObjectNames());
  // console.log(SerializedNitroModules.version);
});

export default function App() {
  return null;
}

declare global {
  var __ENABLE_LOGGING: boolean;
}

// const mathObj = NitroModules.createHybridObject('Math');

// const SerializedNitroModules = createSerializable()

const deserializer: any = (
  value: /* TODO: not exposed BoxedHybridObject<any> */ typeof boxedNitroModules
) => {
  'worklet';
  return value.unbox();
};
