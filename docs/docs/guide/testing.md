---
id: testing
title: "Testing with Jest"
sidebar_label: "Testing with Jest"
---

Reanimated test mocks use web implementation of Reanimated2. Before you begin using Reanimated mocks you need some setup actions.

## Setup

Add the following line to your `jest-setup.js` file:
```js
require('react-native-reanimated/lib/reanimated2/jestUtils').setUpTests();
```
`setUpTests()` can take optional config argument. Default config is `{ fps: 60 }`, setting framerate to 60fps.

To be sure, check if your `jest.config.js` file contains:
```js
...
preset: 'react-native',
setupFiles: ['./jest-setup.js'],
...
```

If you have custom babel configuration for testing, make sure that Reanimated's babel plugin is enabled for that environment.

## API

#### Style checker
- Checking equality of selected styles with current component styles
  #### `expect(component).toHaveAnimatedStyle(expectedStyle)`
  `component` - tested component
  `expectedStyle` - contains expected styles of testing component, for example `{ width: 100 }`

- Checking equality of all current component styles with expected styles
  #### `expect(component).toHaveAnimatedStyle(expectedStyle, {exact: true})`

- You can get all styles of tested component by using `getDefaultStyle`
  #### `getDefaultStyle(component)`
  `component` - tested component

#### Timers
You can use jest timers to control animation
```js
jest.useFakeTimers();
// call animation
jest.runAllTimers();
```
If you want more control over animation, you can use Reanimated wrapper for timers:
```js
withReanimatedTimer(() => {
  // call animation
})
```
Inside of `withReanimatedTimer` you can use `advanceAnimationByTime(timeInMs)` or `advanceAnimationByFrame(amountOfFrames)` functions
- Advance animation by a specified number of frames. You can specify the running duration of the animation and check the value of styles afterward.
  #### `advanceAnimationByTime(timeInMs)`
  `timeInMs` - the duration specifying for how long animation should be advanced forward. Should have an integer value.
- Advance animation by specific amount of animation frame.
  #### `advanceAnimationByFrame(numberOfFrames)`
  `numberOfFrames` - number of animation frames to run. Should have an integer value.

## Example

Timer:

```js
test('stop in a middle of animation', () => {
  withReanimatedTimer(() => {
    const style = { width: 0 };

    const { getByTestId } = render(<AnimatedComponent />);
    const view = getByTestId('view');
    const button = getByTestId('button');

    expect(view.props.style.width).toBe(0);
    expect(view).toHaveAnimatedStyle(style);

    fireEvent.press(button);
    moveAnimationByTime(250); // if whole animation duration is a 500ms
    style.width = 46.08; // value of component width after 250ms of animation
    expect(view).toHaveAnimatedStyle(style);
  });
});
```

More example tests you can see in our repository
- [SharedValue.test.js](https://github.com/software-mansion/react-native-reanimated/tree/master/__tests__/SharedValue.test.js)
- [Animation.test.js](https://github.com/software-mansion/react-native-reanimated/tree/master/__tests__/Animation.test.js)

## Recommended testing library

- [@testing-library/react-native](https://callstack.github.io/react-native-testing-library/)
- [@testing-library/react-hooks](https://react-hooks-testing-library.com/) - for dealing with hooks