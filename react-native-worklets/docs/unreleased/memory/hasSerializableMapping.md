# hasSerializableMapping

Checks whether Worklets remembers a mapping for an object. An object has one after [setSerializableMapping](https://docs.swmansion.com/react-native-worklets/docs/unreleased/memory/setSerializableMapping), or after Worklets [serialized](https://docs.swmansion.com/react-native-worklets/docs/unreleased/memory/serializable) it.

## Reference

```typescript
import {
  hasSerializableMapping,
  setSerializableMapping,
} from 'react-native-worklets';

const flag = { current: false };
console.log(hasSerializableMapping(flag)); // logs `false`

setSerializableMapping(flag, { current: true });
console.log(hasSerializableMapping(flag)); // logs `true`
```

Type definitions

```typescript
function hasSerializableMapping(value: object): boolean;
```

## Arguments

### value

The object to check. It's compared by reference.

## Remarks

* On the Web `hasSerializableMapping` always returns `false`.
