# Testing with Jest

React Native Worklets is primarily a native library, for that reason it requires a proper setup to be tested with Jest. This guide will show you how to set it up when testing in a React Native project.

You have two options for this:

1. **Enforce the use of mock implementation for React Native Worklets.**

   React Native Worklets provides a complete mock implementation for Jest. This is the recommended approach for testing.

2. **Enforce the use of Web implementation for React Native Worklets.**

   React Native Worklets has a separate Web implementation to use in the browser. Use this approach when you want to avoid using artifical mocks.

## Using the mock implementation

Depending on whether you are using TypeScript or JavaScript, apply the following mock:

```js
jest.mock('react-native-worklets', () =>
  require('react-native-worklets/src/mock')
);
```

```js
jest.mock('react-native-worklets', () =>
  require('react-native-worklets/lib/module/mock')
);
```

## Using the Web implementation

Override Jest resolver to enforce resolving web implementation of React Native Worklets instead of pulling the native one. Modify your `jest.config.js` file to include the following code:

```js
module.exports = {
  // ... other configurations
  resolver: 'react-native-worklets/jest/resolver',
};
```
