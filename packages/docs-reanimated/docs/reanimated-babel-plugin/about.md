---
id: about
title: 'About'
sidebar_label: 'About'
---

# Reanimated Babel Plugin

This article will explain what exactly is Reanimated Babel Plugin, what are its features and limitations, without going into unnecessary details.

## What is Reanimated Babel Plugin?

Reanimated Babel Plugin is the part of Reanimated that allows you to employ the second JavaScript runtime created by Reanimated, called the UI/Worklet runtime. The plugin transforms your code, injects all the necessary data into it, so that the Worklet runtime can execute the code. This data comes from _worklets_. The process of worklet transformation is called _workletization_.

## What is a worklet?

A worklet is:

- A function that contains a `'worklet'` directive at its very top, i.e.:

```ts
function foo() {
  'worklet';
  console.log('Hello from worklet');
}
```

- A function that is _autoworkletizable_, i.e.:

```ts
useAnimatedStyle(() => {
  // This function will be ran on the Worklet Runtime,
  // hence it's in a workletizable context and will be
  // autoworkletized. You don't need to add the 'worklet' directive here.
  return {
    width: 100,
  };
});
```

## What can be a worklet?

Currently, Reanimated Babel Plugin supports the following constructs as worklets:

- Arrow Function Expressions

```ts
const foo = () => {
  'worklet';
  console.log('Hello from ArrowFunctionExpression');
};
```

- Function Declarations

```ts
function foo() {
  'worklet';
  console.log('Hello from FunctionDeclaration');
}
```

- Function Expressions

```ts
const foo = function () {
  'worklet';
  console.log('Hello from FunctionExpression');
};
```

- Object Methods

```ts
const obj = {
  foo() {
    'worklet';
    console.log('Hello from ObjectMethod');
  },
};
```

## Autoworkletization

To reduce boilerplate code and relieve the user from knowing the internals of Reanimated, Reanimated Babel Plugin tries to detect automatically whether a function should be workletized. For example, all callbacks in Reanimated API that are ran on the Worklet runtime are autoworkletized, such as:

- `useAnimatedStyle`
- `useAnimatedProps`
- `runOnUI`

etc.

Thanks to that, you don't need to add the `'worklet'` directive to your code when you're not exploring any advanced use cases.

### Referencing worklets

You can define worklets before they are used, and the plugin will autoworkletize them too:

```ts
function foo() {
  // You don't need to mark it as a worklet.
  return { width: 100 };
}

const style = useAnimatedStyle(foo); // You don't need to define an inline function here.
```

### Objects aggregating worklets

In some APIs, like `useAnimatedScrollHandler` you can pass an object that contains worklets instead of a function:

```ts
const handlerObject = {
  // You don't need to mark these methods as worklets.
  onBeginDrag() {
    console.log('Dragging...');
  },
  onScroll() {
    console.log('Scrolling...');
  },
};

const handler = useAnimatedScrollHandler(handlerObject);
```

### Workletizing whole files (experimental)

You can mark a file as a workletizable file by adding the `'worklet'` directive to the top of the file. This will make all _top-level_ entities workletized. This can come in handy for files that contain multiple worklets.

```ts
'worklet';

function foo() {
  // This function will be autoworkletized.
  return { width: 100 };
}

function bar() {
  // This function will be autoworkletized.
  function foobar() {
    // This function won't since it's not defined in top-level scope.
    console.log('Hello from worklet');
  }
  return { width: 100 };
}
```

## Limits of autoworkletization

The plugin cannot infer whether a function is autoworkletizable or not in some contexts.

### Imports

When importing a function from another file or a module and using it as a worklet, you must manually add the `'worklet'` directive to the function:

```ts
// foo.js
export function foo() {
  'worklet'; // Won't work without it.
  return {
    width: 100,
  };
}

// bar.ts
import { foo } from './foo';
const style = useAnimatedStyle(foo);
```

### Custom hooks

Currently Reanimated hasn't exposed APIs that would allow you to register your custom hooks for callback workletization. This however, might change in the future.

### Expressions

When the worklet is a result of an expression, it won't get autoworkletized hence you need to add the `'worklet'` directive to it manually:

```ts
const foo = someCondition
  ? () => {
      'worklet'; // Won't work without it.
      return { width: 100 };
    }
  : () => {
      'worklet'; // Won't work without it.
      return { width: 200 };
    };

const style = useAnimatedStyle(foo);
```

In such cases we recommend you to handle the conditional logic in the worklet itself or to refactor your code to avoid the need for conditional worklets.

## Pitfalls

There are some patterns that won't work with the plugin, regardless of whether they are autoworkletizable or not.

### Hoisting worklets

Worklets are not hoisted. This means that you can't use worklets before they are defined. For example:

```ts
const style = useAnimatedStyle(foo); // Crashes, even though 'foo' is marked as a worklet.

function foo() {
  'worklet';
  return { width: 100 };
}
```

### Classes

Class methods can be marked as worklets, but classes themselves cannot be used on the Worklet runtime.

## Notes

Babel is a powerful tool that can be explored to implement numerous useful features. If you feel like Reanimated Babel plugin could make use of some new functionality or that its pitfalls are too severe, feel free to let us know on [GitHub](https://github.com/software-mansion/react-native-reanimated/), via an issue or a discussion thread - and as always, PRs are welcome!
