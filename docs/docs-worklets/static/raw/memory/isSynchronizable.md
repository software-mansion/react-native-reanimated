# isSynchronizable&#x20;

Asserts whether a value is a [Synchronizable](/docs/memory/synchronizable).

You can pass a generic type argument to specify the expected value type held by the Synchronizable.

## Reference

```typescript
import { isSynchronizable } from 'react-native-worklets';
const maybeSynchronizable = ...; // type: unknown

console.log(isSynchronizable(maybeSynchronizable)); // logs `true` if `maybeSynchronizable` is a Synchronizable.

if (isSynchronizable<number>(maybeSynchronizable)) {
  // Here, TypeScript knows that `maybeSynchronizable` is of type `Synchronizable<number>`
  maybeSynchronizable.setBlocking(42);
}
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
