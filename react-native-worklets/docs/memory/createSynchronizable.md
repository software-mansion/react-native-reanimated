# createSynchronizable

Creates a new [Synchronizable](/docs/memory/synchronizable) holding the provided initial value. Returns the created Synchronizable.

By default it creates a [Synchronizable Dynamic](/docs/memory/synchronizable#synchronizable-dynamic).

You can pass a config option to create [Synchronizable Fixed](/docs/memory/synchronizable#synchronizable-fixed) instead.

## Reference

```tsx
import { createSynchronizable } from 'react-native-worklets';

const synchronizable = createSynchronizable({ a: 42 });
const counter = createSynchronizable(0, { fixedType: true });
```

Type definitions

```typescript
function createSynchronizable<TValue extends number | boolean>(
  initialValue: TValue,
  config: SynchronizableConfig & { fixedType: true }
): FixedSynchronizable<TValue extends boolean ? boolean : number>;

function createSynchronizable<TValue>(
  initialValue: TValue,
  config?: SynchronizableConfig
): Synchronizable<TValue>;

type SynchronizableConfig = {
  fixedType?: boolean;
};
```

## Arguments

### initialValue

The initial value to be held by the created Synchronizable. As it has to be serialized before passing to C++, it must be one of the supported types listed in the [Serializable](/docs/memory/serializable) documentation.

With the [`fixedType` option](#config) it isn't serialized and must be a `number` or a `boolean`.

### config

Optional configuration for the Synchronizable. An object with the following properties:

* `fixedType` - when `true`, the created [Synchronizable Fixed](/docs/memory/synchronizable#synchronizable-fixed) stores its `number` or `boolean` value directly in native memory, without serialization, and exposes the additional [`setDirty`](/docs/memory/synchronizable#setdirty) method. Defaults to `false`.

## Remarks

* In [Legacy Eval Mode](/docs/bundleMode#legacy-eval-mode), `createSynchronizable` can be called only on the [RN Runtime](/docs/fundamentals/runtimeKinds#rn-runtime). In Bundle Mode, it can be called on any Runtime.
