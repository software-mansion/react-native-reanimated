# getCurrentThreadId

`getCurrentThreadId` returns the id of the thread which currently executes JavaScript on the calling [Runtime](https://docs.swmansion.com/react-native-worklets/docs/unreleased/concepts/runtimeKinds). The returned id is a stringified result of [`std::this_thread::get_id()`](https://en.cppreference.com/cpp/thread/get_id).

## Reference

```js
import {
  getCurrentThreadId,
  runOnUISync,
  scheduleOnUI,
} from 'react-native-worklets';

function logThread() {
  'worklet';
  console.log(getCurrentThreadId());
}

logThread(); // The JS thread id.
scheduleOnUI(logThread); // The UI thread id.
runOnUISync(logThread); // The JS thread id.
```

Type definitions

```typescript
function getCurrentThreadId(): string;
```

### Returns

`getCurrentThreadId` returns a `string` with the id of the current thread. The format of the id is platform-specific.

## Call table

| Mode             | RN Runtime | UI Runtime | Worker Runtime |
| ---------------- | ---------- | ---------- | -------------- |
| Bundle Mode      | Supported  | Supported  | Supported      |
| Legacy Eval Mode | Supported  | Supported  | Supported      |

## Platform compatibility

| Native    | Web           |
| --------- | ------------- |
| Supported | Not supported |
