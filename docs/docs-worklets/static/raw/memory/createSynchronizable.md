# createSynchronizable&#x20;

Creates a new [Synchronizable](/docs/memory/synchronizable) holding the provided initial value. Returns the created Synchronizable.

## Reference

```tsx
import { createSynchronizable } from 'react-native-worklets';

const synchronizable = createSynchronizable({ a: 42 });
```

Type definitions

```typescript
function createSynchronizable<TValue>(
  initialValue: TValue
): Synchronizable<TValue>;
```

## Arguments

### initialValue

The initial value to be held by the created Synchronizable. As it has to be serialized before passing to C++, it must be one of the supported types listed in the [Serializable](/docs/memory/serializable) documentation.

## Remarks

* Outside of [Bundle Mode](/docs/bundleMode/), `createSynchronizable` can be called only on the [RN Runtime](/docs/fundamentals/runtimeKinds#rn-runtime). In Bundle Mode, it can be called from any Runtime.
