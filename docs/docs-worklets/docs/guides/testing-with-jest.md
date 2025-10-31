---
id: testing
sidebar_label: 'Testing with Jest'
---

# Testing with Jest

Worklets code currently can't be tested in Jest directly. Instead you have to use its mock implementation.

## Setup

If you already have Jest tests set up for [Reanimated](https://docs.swmansion.com/react-native-reanimated/docs/guides/testing-with-jest/), no additional setup is required.

### TypeScript

If you have Jest configured to run TypeScript files, add the following code to your setup file:

```ts
jest.mock('react-native-worklets', () =>
  require('react-native-worklets/src/mock')
);
```

### JavaScript

For JavaScript files, add the following code to your setup file:

```js
jest.mock('react-native-worklets', () =>
  require('react-native-worklets/lib/module/mock')
);
```
