# getCurrentThreadId

`getCurrentThreadId` returns the id of the thread which currently executes JavaScript on the calling [Runtime](/docs/fundamentals/runtimeKinds). The returned id is a stringified result of [`std::this_thread::get_id()`](https://en.cppreference.com/cpp/thread/get_id).

## Reference

```javascript
import { getCurrentThreadId, runOnUISync, scheduleOnUI } from 'react-native-worklets';

console.log(getCurrentThreadId()); // The JS thread id.

scheduleOnUI(() => {
  'worklet';
  console.log(getCurrentThreadId()); // The UI thread id.
});

runOnUISync(() => {
    'worklet';
    console.log(getCurrentThreadId()); // The JS thread id.
})
```

Type definitions

```typescript
function getCurrentThreadId(): string;
```

### Returns

`getCurrentThreadId` returns a `string` with the id of the current thread. The format of the id is platform-specific.

## Call table

## Platform compatibility
