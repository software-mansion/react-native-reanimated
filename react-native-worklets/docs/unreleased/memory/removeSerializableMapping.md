# removeSerializableMapping

Makes Worklets forget the mapping of an object, whether it came from [setSerializableMapping](https://docs.swmansion.com/react-native-worklets/docs/unreleased/memory/setSerializableMapping) or from an earlier [serialization](https://docs.swmansion.com/react-native-worklets/docs/unreleased/memory/serializable). The next time the object is serialized, Worklets serializes the object itself and remembers the new mapping.

## Reference

```typescript
import {
  removeSerializableMapping,
  scheduleOnUI,
  setSerializableMapping,
} from 'react-native-worklets';

const flag = { current: false };
setSerializableMapping(flag, { current: true });
removeSerializableMapping(flag);

scheduleOnUI(() => {
  console.log(flag.current); // logs `false`
});
```

Type definitions

```typescript
function removeSerializableMapping(value: object): void;
```

## Arguments

### value

The object whose mapping to remove. It's compared by reference.

## Remarks

* `removeSerializableMapping` also removes mappings that Worklets or other libraries set.
* If `value` has no mapping, `removeSerializableMapping` does nothing.
* Passing a [SerializableRef](https://docs.swmansion.com/react-native-worklets/docs/unreleased/memory/isSerializableRef) does nothing.
* On the Web `removeSerializableMapping` does nothing.
