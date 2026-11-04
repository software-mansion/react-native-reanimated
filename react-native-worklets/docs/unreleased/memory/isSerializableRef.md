# isSerializableRef

Asserts whether a value is a [Serializable](https://docs.swmansion.com/react-native-worklets/docs/unreleased/memory/serializable) reference.

## Reference

The reference returns `true`; the original JavaScript object returns `false`.

```js
import { createSerializable, isSerializableRef } from 'react-native-worklets';

const value = { count: 0 };
const reference = createSerializable(value);

console.log(isSerializableRef(reference)); // true
console.log(isSerializableRef(value)); // false
```

Type definitions

```typescript
function isSerializableRef(value: unknown): value is SerializableRef;
```

## Arguments

### value

The value to be checked.

## Remarks

* `isSerializableRef` can be called from any JavaScript Runtime.
* On Web, `isSerializableRef` always returns `true`.
