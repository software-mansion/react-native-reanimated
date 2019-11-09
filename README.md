<p align="center">
  <h1 align="center">React Native Reanimated</h1>
  <h3 align="center">React Native's Animated library reimplemented..</h3>
</p>

React Native Reanimated provides a more comprehensive,
low level abstraction for the Animated library API to be built
on top of and hence allow for much greater flexibility especially when it
comes to gesture based interactions.

## Installation

Check [getting started](https://kmagiera.github.io/react-native-reanimated/getting-started.html) section of our docs for the detailed installation instructions.

## Documentation

Check out our dedicated documentation page for info about this library, API reference and more: [https://kmagiera.github.io/react-native-reanimated](https://kmagiera.github.io/react-native-reanimated)

## Examples

If you want to play with the API but don't feel like trying it on a real app, you can run the example project. Clone the repo, go to the `Example/` folder and run:

```bash
  yarn install
```

Then run `react-native run-android` or `react-native run-ios` (depending on which platform you want to run the example app on).

You will need to have an Android or iOS device or emulator connected as well as `react-native-cli` package installed globally.

## Jest

In order to use `react-native-reanimated` with Jest, you need to add the following mock implementation at the top of your test:

```js
jest.mock('react-native-reanimated', () =>
  require('react-native-reanimated/mock')
);
```

## 100% declarative gesture interactions

`react-native-reanimated` works best with the [Gesture Handler](https://kmagiera.github.io/react-native-gesture-handler) library. Currently all the examples are made using that library, including the ultimate [ImagePreview app](https://github.com/kmagiera/react-native-reanimated/blob/master/Example/imageViewer). See it in action below:

![](/assets/imagepreview.gif)

## License

Gesture handler library is licensed under [The MIT License](LICENSE).

## Credits

This project is supported by amazing people from [Expo.io](https://expo.io) and [Software Mansion](https://swmansion.com)

[![expo](https://avatars2.githubusercontent.com/u/12504344?v=3&s=100 'Expo.io')](https://expo.io)
[![swm](https://avatars1.githubusercontent.com/u/6952717?v=3&s=100 'Software Mansion')](https://swmansion.com)
