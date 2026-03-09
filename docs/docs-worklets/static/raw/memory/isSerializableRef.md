# isSerializableRef

Asserts whether a value is a [Serializable](/docs/memory/serializable) reference.

## Reference

```typescript
import { isSerializableRef } from 'react-native-worklets';
const maybeSerializableRef = ...; // type: unknown

console.log(isSerializableRef(maybeSerializableRef)); // logs `true` if `maybeSerializableRef` is a SerializableRef.
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
