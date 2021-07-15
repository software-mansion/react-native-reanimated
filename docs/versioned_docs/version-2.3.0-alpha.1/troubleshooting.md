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
