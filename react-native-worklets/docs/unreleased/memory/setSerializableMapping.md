# setSerializableMapping

When Worklets [serializes](https://docs.swmansion.com/react-native-worklets/docs/unreleased/memory/serializable) an object, for example when a [worklet](https://docs.swmansion.com/react-native-worklets/docs/unreleased/tutorials/concurrency-model#worklet-functions) captures it in its closure, it sends a serialized copy of that object to the other Runtime and remembers the mapping from the object to that copy. `setSerializableMapping` lets you set the mapping manually.

## Reference

```typescript
import { scheduleOnUI, setSerializableMapping } from 'react-native-worklets';

const flag = { current: false };
setSerializableMapping(flag, { current: true });

scheduleOnUI(() => {
  console.log(flag.current); // logs `true`
});
```

Type definitions

```typescript
function setSerializableMapping(value: object, mapping: unknown): void;
```

## Arguments

### value

The object to set the mapping for. It's compared by reference.

### mapping

The value to send in place of `value`. It's serialized once, when `setSerializableMapping` is called. It can also be a [SerializableRef](https://docs.swmansion.com/react-native-worklets/docs/unreleased/memory/isSerializableRef), which is used as is.

## Remarks

* The new mapping overwrites the existing one for `value`, including one that Worklets created when it serialized `value` earlier.
* Use [hasSerializableMapping](https://docs.swmansion.com/react-native-worklets/docs/unreleased/memory/hasSerializableMapping) to check whether `value` already has a mapping.
* Use [getSerializableMapping](https://docs.swmansion.com/react-native-worklets/docs/unreleased/memory/getSerializableMapping) to read the mapping.
* Use [removeSerializableMapping](https://docs.swmansion.com/react-native-worklets/docs/unreleased/memory/removeSerializableMapping) to remove the mapping.
* Each Runtime keeps its own mappings, so `setSerializableMapping` affects only the values that the calling Runtime serializes.
* On the Web `setSerializableMapping` does nothing, because values aren't serialized there.
