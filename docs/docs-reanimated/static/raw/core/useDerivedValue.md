# useDerivedValue

`useDerivedValue` lets you create new [shared values](/docs/fundamentals/glossary#shared-value) based on existing ones while keeping them reactive.

## Reference

```javascript
import { useDerivedValue } from 'react-native-reanimated';

function App() {
  const derivedValue = useDerivedValue(() => {
    return sv.value * 50;
  });
}
```

Type definitions

```typescript
interface SharedValue<Value = unknown> {
  value: Value;
  get(): Value;
  set(value: Value | ((value: Value) => Value)): void;
  addListener: (listenerID: number, listener: (value: Value) => void) => void;
  removeListener: (listenerID: number) => void;
  modify: (modifier?: (value: Value) => Value, forceUpdate?: boolean) => void;
}

interface DerivedValue<Value = unknown>
  extends Readonly<Omit<SharedValue<Value>, 'set'>> {
  /**
   * @deprecated Derived values are readonly, don't use this method. It's here
   *   only to prevent breaking changes in TypeScript types. It will be removed
   *   in the future.
   */
  set: SharedValue<Value>['set'];
}

function useDerivedValue<T>(
  updater: () => T,
  dependencies?: DependencyList
): DerivedValue<T>;
```

### Arguments

#### `updater`

A function that should return a value constructed of shared values, React state or any other JavaScript value. This function is called whenever at least one of the shared values or state used in the function body changes.

#### `dependencies`&#x20;

An optional array of dependencies.

Only relevant when using Reanimated [without the Babel plugin on the Web](https://docs.swmansion.com/react-native-reanimated/docs/guides/web-support#web-without-the-babel-plugin).

### Returns

`useDerivedValue` returns a new readonly [shared value](/docs/fundamentals/glossary#shared-value) based on a value returned from the [`updater`](/docs/core/useDerivedValue#updater) function.

## Example

## Remarks

* The callback passed to the first argument is automatically [workletized](/docs/fundamentals/glossary#to-workletize) and ran on the [UI thread](/docs/fundamentals/glossary#ui-thread).

* You can also use `useDerivedValue` without returning a value in the `updater` function to react to a change of a shared value. If you need to access the previous value stored in a shared value use [`useAnimatedReaction`](/docs/advanced/useAnimatedReaction) instead.

## Platform compatibility
