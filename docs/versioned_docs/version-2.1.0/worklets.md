---
id: worklets
title: Worklets
sidebar_label: Worklets
---

The ultimate goal of worklets was for them to define small pieces of JavaScript code that we run when updating view properties or reacting to events on the UI thread. A natural construct in JavaScript for such a purpose was a simple method. With Reanimated 2 we spawn a secondary JS context on the UI thread that then is able to run JavaScript functions. The only thing that is needed is for that function to have “worklet” directive at the top:

```js
function someWorklet(greeting) {
  'worklet';
  console.log("Hey I'm running on the UI thread");
}
```

Functions are a great construct for our needs because you can communicate with the code they run by passing arguments. Each worklet function can be run either on the main React Native thread if you just call that function in your code, or you can execute it on the UI thread using `runOnUI`. Note that UI execution is asynchronous from the caller’s perspective. When you pass arguments, they will be copied to the UI JS context.

```js
function someWorklet(greeting) {
  'worklet';
  console.log(greeting, 'From the UI thread');
}

function onPress() {
  runOnUI(someWorklet)('Howdy');
}
```

In addition to arguments, functions also capture the context where they are defined. So when you have a variable that is defined outside of the worklet scope but is used inside a worklet, it will also be copied along with the arguments and you’d be able to use it (we refer to it as capturing given params):

```js
const width = 135.5;

function otherWorklet() {
  'worklet';
  console.log('Captured width is', width);
}
```

Worklets can capture (or take as arguments) from other worklets, in which case when called, they will execute synchronously on the UI thread:

```js
function returningWorklet() {
  'worklet';
  return "I'm back";
}

function someWorklet() {
  'worklet';
  let what = returningWorklet();
  console.log('On the UI thread, other worklet says', what);
}
```

And hey – this works for regular methods too. In fact, console.log is not defined in the UI JS context, but is a reference to a method that the React Native JS context provides. So when we used `console.log` in the previous examples it was actually executed on the React Native thread.

```js
function callback(text) {
  console.log('Running on the RN thread', text);
}

function someWorklet() {
  'worklet';
  console.log("I'm on UI but can call methods from the RN thread");
  runOnJS(callback)('can pass arguments too');
}
```

## Using hooks

In practice, when writing animations and interactions with Reanimated, you will rarely need to create worklets using `'worklet'` directive (just take a look at `Example/` folder to see we don't have that many occurences of the directive).
What you will be using most of the time instead, are worklets that can be constructed by one of the hooks from Reanimated API, e.g. `useAnimatedStyle`, `useDerivedValue`, `useAnimatedGestureHandler`, etc.
When using one of the hooks listed in the Reanimated API Reference, we automatically detect that the provided method is a worklet and do not require the directive to be specified.
The method provided to the hook will be turned into a worklet and executed on the UI thread automatically.

```js
const style = useAnimatedStyle(() => {
  console.log("Running on the UI thread");
  return {
    opacity: 0.5
  };
});
```


