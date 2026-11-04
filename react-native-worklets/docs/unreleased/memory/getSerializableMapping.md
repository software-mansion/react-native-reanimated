# getSerializableMapping

Returns the [SerializableRef](https://docs.swmansion.com/react-native-worklets/docs/unreleased/memory/isSerializableRef) that Worklets sends to other Runtimes in place of an object. An object has one after [setSerializableMapping](https://docs.swmansion.com/react-native-worklets/docs/unreleased/memory/setSerializableMapping), or after Worklets [serialized](https://docs.swmansion.com/react-native-worklets/docs/unreleased/memory/serializable) it.

## Reference

```typescript
import {
  getSerializableMapping,
  setSerializableMapping,
} from 'react-native-worklets';

const flag = { current: false };
console.log(getSerializableMapping(flag)); // logs `undefined`

setSerializableMapping(flag, { current: true });
// the SerializableRef of `{ current: true }`
const mapping = getSerializableMapping(flag);
```

Type definitions

```typescript
function getSerializableMapping(value: object): SerializableRef | undefined;
```

## Arguments

### value

The object to get the mapping of. It's compared by reference.

## Returns

The [SerializableRef](https://docs.swmansion.com/react-native-worklets/docs/unreleased/memory/isSerializableRef) mapped to `value`, or `undefined` if `value` has no mapping.

## Remarks

* On the Web `getSerializableMapping` always returns `undefined`.
