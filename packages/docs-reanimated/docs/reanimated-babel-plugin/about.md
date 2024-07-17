---
id: about
title: 'About'
sidebar_label: 'About'
---

# Reanimated Babel Plugin

## What is Reanimated Babel Plugin?

The Reanimated Babel Plugin transforms your code so that it can run on the [UI thread](/docs/fundamentals/glossary#ui-thread). It looks for functions marked with a `'worklet';` directive and converts them into serializable objects. We call this process [workletization](/docs/fundamentals/glossary#to-workletize).

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
  // This function will be ran on the UI thread,
  // hence it's in a workletizable context and will be
  // autoworkletized. You don't need to add the 'worklet' directive here.
  return {
    width: 100,
  };
});
```

## What can be a worklet?

Currently, Reanimated Babel Plugin supports the following constructs as worklets:

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

- Arrow Function Expressions

```ts
const foo = () => {
  'worklet';
  console.log('Hello from ArrowFunctionExpression');
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

To reduce boilerplate code and provide a safer API, Reanimated Babel Plugin detects automatically whether a function should be workletized. Thanks to that, you don't need to add the `'worklet'` directive to your callbacks:

```ts
const style = useAnimatedStyle(() => {
  // You don't need to add the 'worklet' directive here,
  // since plugin detects this callback as autoworkletizable.
  return {
    width: 100,
  };
});
```

This isn't limited to `useAnimatedStyle` hook - Reanimated Babel Plugin autoworkletizes all callbacks for the API of Reanimated. The whole list can be found in the [plugin source code](https://github.com/software-mansion/react-native-reanimated/blob/main/packages/react-native-reanimated/plugin/src/autoworkletization.ts).

Keep in mind that in more advanced use cases, you might still need to manually mark a function as a worklet.

### Referencing worklets

You can define worklets **before** they are used and the plugin will autoworkletize them too:

```ts
function foo() {
  // You don't need to add
  // the 'worklet' directive here.
  return { width: 100 };
}

// You don't need to define an inline function here,
// a reference is enough.
const style = useAnimatedStyle(foo);
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

You can mark a file as a workletizable file by adding the `'worklet'` directive to the top of the file.

This will make all _top-level_

- Functions
- Objects aggregating worklets

workletized automatically. This can come in handy for files that contain multiple worklets.

```ts
// file.ts
'worklet';

function foo() {
  // Function 'foo' will be autoworkletized.
  return { width: 100 };
}

function bar() {
  // Function 'bar' will be autoworkletized.
  function foobar() {
    // Function 'foobar' won't since it's not defined in top-level scope.
    console.log("I'm not a worklet");
  }
  return { width: 100 };
}
```

## Limits of autoworkletization

The plugin cannot infer whether a function is autoworkletizable or not in some contexts.

### Imports

When importing a function from another file or a module and using it as a worklet, you must manually add the `'worklet'` directive to the function:

```ts
// foo.ts
import { bar } from './bar';
// ...
const style = useAnimatedStyle(bar);

// bar.ts
export function bar() {
  'worklet'; // Won't work without it.
  return {
    width: 100,
  };
}
```

### Custom hooks

Currently Reanimated hasn't exposed APIs that would allow you to register your custom hooks for callback workletization. This however, might change in the future.

### Expressions

A function won't get automatically workletized when it's a result of an expression. You have to add the `"worklet";` directive to make it work:

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

In such cases we recommend either handling the conditional logic in the worklet itself or refactoring your code to eliminate the need for conditional worklets.

## Pitfalls

There are some patterns that won't work with the plugin.

### Hoisting worklets

Worklets aren't hoisted. This means that you can't use worklets before they are defined:

```ts
// The following line crashes,
// even though 'foo' is marked as a worklet.
const style = useAnimatedStyle(foo);

function foo() {
  'worklet';
  return { width: 100 };
}
```

### Classes

You can't use classes on the UI thread:

```ts
class Clazz {
  foo() {
    'worklet';
    return { width: 100 };
  }
}

const clazz = new Clazz();

// The following line crashes,
// even though 'foo' is marked as a worklet.
const style = useAnimatedStyle(clazz.foo());
```

## Notes

Babel is a powerful tool that can be explored to implement numerous useful features. If you feel like Reanimated Babel plugin could make use of some new functionality or that its pitfalls are too severe, feel free to let us know on [GitHub](https://github.com/software-mansion/react-native-reanimated/), via an issue or a discussion thread - and as always, PRs are welcome!
