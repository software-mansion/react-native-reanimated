# Worklets integration examples

This Expo app shows how a React Native library sends native data to the [UI Runtime](https://docs.swmansion.com/react-native-worklets/docs/concepts/runtimeKinds#ui-runtime). A Reanimated shared value then updates while the JavaScript thread is busy. The Worklets guide [Sending native data to the UI Runtime](https://docs.swmansion.com/react-native-worklets/docs/guides/sending-native-data-to-the-ui-runtime) explains each method.

The app uses the Worklets and Reanimated packages of this repository. It uses Expo SDK 58 with React Native 0.88.1, so it has its own `node_modules`.

## Packages

| Package                                                 | The data comes from  | It gets to the UI Runtime through                     |
| ------------------------------------------------------- | -------------------- | ----------------------------------------------------- |
| [`with-expo-module`](packages/with-expo-module)         | An Expo module       | The `Worklet` type of Expo Modules API                |
| [`with-cpp-turbomodule`](packages/with-cpp-turbomodule) | A C++ TurboModule    | The C++ stable API of Worklets                        |
| [`with-nitro`](packages/with-nitro)                     | A Nitro HybridObject | A callback and a Nitro `Dispatcher` on the UI Runtime |
| [`with-view-event`](packages/with-view-event)           | A native view        | A Fabric event and a Reanimated event handler         |
| [`ui-to-native`](packages/ui-to-native)                 | A TurboModule method | A worklet on the UI Runtime that calls the method     |

Each package has a native counter that adds 1 about 60 times each second. Each package has two entry points: `.` works without Reanimated, and `./reanimated` gives a shared value.

The app has six screens: one for each package, and a second Expo screen that reads the value on each frame. Each screen shows the counter as a shared value and as React state. The button "Block the JS thread for 10 s" stops the JS thread. During the block, the shared value continues to change and the React state stops.

## Run the app

Install the dependencies at the repository root, then start the app:

```sh
yarn
cd apps/integration-examples
yarn android # or: yarn ios
```

After you change [`Counter.nitro.ts`](packages/with-nitro/src/specs/Counter.nitro.ts), run `yarn workspace with-nitro nitrogen` and commit the generated code.

## End-to-end tests

Each [Argent](https://www.npmjs.com/package/@swmansion/argent) test in [`.argent/e2e`](.argent/e2e) opens one screen, blocks the JS thread and checks that the shared value changes while the React state stops. CI runs the tests with Argent 0.32.0: on Android for pull requests that change the app, Worklets or Reanimated, and on Android and iOS each night.

To run the tests, install the app on one device, for example with `yarn android`. The test script uses the only booted device, so boot no other device. Then run:

```sh
cd apps/integration-examples
argent e2e run .argent/e2e --platform android # or: --platform ios
```
