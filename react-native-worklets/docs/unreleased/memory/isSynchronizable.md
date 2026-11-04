# isSynchronizable

Asserts whether a value is a [Synchronizable](https://docs.swmansion.com/react-native-worklets/docs/unreleased/memory/synchronizable).

You can pass a generic type argument, such as `isSynchronizable<number>(value)`, to narrow the value to `Synchronizable<number>` in TypeScript. This checks whether the value is a Synchronizable; it does not check the type of the data inside it.

## Reference

Check both a Synchronizable and a plain object, then guard an update with `isSynchronizable`. The shared value changes from `0` to `42`.

```js
import { createSynchronizable, isSynchronizable } from 'react-native-worklets';

const counter = createSynchronizable(0);

console.log(isSynchronizable(counter)); // true
console.log(isSynchronizable({ count: 0 })); // false

if (isSynchronizable(counter)) {
  counter.setBlocking(42);
}
console.log(counter.getBlocking()); // 42
```

Type definitions

```typescript
function isSynchronizable<TValue = unknown>(
  value: unknown
): value is Synchronizable<TValue>;
```

## Arguments

### value

The value to be checked.

## Remarks

* `isSynchronizable` can be called from any JavaScript Runtime.
