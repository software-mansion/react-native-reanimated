---
id: testing
title: "Testing with Jest"
sidebar_label: "Testing with Jest"
---

Reanimated test mocks use web implementation of Reanimated2. Before you begin using Reanimated mocks you need some setup actions.

## Setup

To your `jest-setup.js` file add the following line:
```js
require('./node_modules/react-native-reanimated/src/reanimated2/jestUtils').setUpTests();
```
`setUpTests({ fps: 60 })` can take optional config argument with specific frameRate. By default it is 60fps.  

To be sure, check your `jest.config.js` file to contains:
```js
...
preset: 'react-native',
setupFiles: ['./jest-setup.js'],
...
```

## API

#### Style checker
- Checking equality of selected styles with current component styles
  #### `expect(component).toHaveAnimatedStyle(expectedStyle)`
  `component: obj` - tested component  
  `expectedStyle: obj ` - conntains expected styles of testing component, for example `{ width: 100 }`  

- Checking equality all current component styles with expected styles
  #### `expect(component).toHaveAnimatedStyle(expectedStyle, true)`

- You can get all styles of tested component by using `getDefaultStyle`
  #### `getDefaultStyle(component)`  
  `component: obj` - tested component  

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
inside of `withReanimatedTimer` you can use `moveAnimationByTime(timeInMs)` or `moveAnimationByFrame(amountOfFrames)` functions
- Move animation by specific time. You can select time of running animation and check value of style after this time.
  #### `moveAnimationByTime(timeInMs)`
  `timeInMs: number` - time of runing animation  
- Move animation by specific amount of animation frame.
  #### `moveAnimationByFrame(amountOfFrame)`
  `amountOfFrames: number` - amount of frames of animation to run  

## Example

Timer:

```js
test('stop in a middle of animation', () => {
  withReanimatedTimer(() => {
    const style = getDefaultStyle();

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