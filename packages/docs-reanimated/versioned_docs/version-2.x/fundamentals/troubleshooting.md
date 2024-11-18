---
id: troubleshooting
title: Troubleshooting common problems
sidebar_label: Troubleshooting
---

### `TypeError: Cannot convert undefined value to object` on `someVariable._closure`

This error frequently happens when metro cache is not updated. Clear it with:

```
watchman watch-del-all
yarn start --reset-cache
```

Also, make sure that you installed the babel plugin.

### `undefined is not an object (evaluating '_toConsumableArray(Array(length)).map')`

This error shows when you use spread (`...array`) inside worklets. See [Known problems and limitations](about.md#known-problems-and-limitations) section for more information about spread support.
Depending on how spread is used you may try one of the following alternatives:

- copying array: [`array.slice()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/slice)
- `[...Array(length)].map` idiom: `Array(length).fill().map()`
- merging objects: [`Object.assign()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/assign)
- spreading args in function: [`func.apply()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/apply)

### `Export namespace should be first transformed by 'babel/plugin-proposal-export-namespace-from'`

This error usually happens, when you forget to add the babel plugin in your `babel.plugin.js`. Please make
sure you have added it.

### Multiple versions of Reanimated were detected

This error usually happens when in your project there exists more than one instance of Reanimated. It can occur when some of your dependency has installed Reanimated inside their own `node_modules` instead of using it as a peer dependency. In this case two different versions of Reanimated JS module try to install the same Native Module. You can resolve this problem manually by modifying your `package.json` file.

You can check which libraries are using Reanimated, for example, with the command:

```bash
npm why react-native-reanimated
```

If you use `yarn` you should add [`resolution` property](https://classic.yarnpkg.com/lang/en/docs/selective-version-resolutions/).

```json
"resolutions": {
  "react-native-reanimated": <Reanimated version>
}
```

If you use `npm` you should add [`overrides` property](https://docs.npmjs.com/cli/v8/configuring-npm/package-json#overrides).

```json
"overrides": {
  "react-native-reanimated": <Reanimated version>
}
```

After that you need to run you package manager again

```bash
yarn
```

or

```bash
npm install
```
