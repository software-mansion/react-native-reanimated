# dispatchCommand

`dispatchCommand` allows you to run commands on a native component from the UI thread directly.

## Reference

```javascript
import { dispatchCommand } from 'react-native-reanimated';

function App() {
  const animatedRef = useAnimatedRef();

  const gesture = Gesture.Tap().onStart(() => {
    // highlight-next-line
    dispatchCommand(animatedRef, 'focus');
  });

  return (
    <>
      <AnimatedTextInput ref={animatedRef} style={styles.input} />
      <GestureDetector gesture={gesture}>
        <Button title="Focus" />
      </GestureDetector>
    </>
  );
}
```

Type definitions

```typescript
function dispatchCommand<T extends Component>(
  animatedRef: AnimatedRef<T>,
  commandName: string,
  args?: unknown[]
) => void;
```

### Arguments

#### `animatedRef`

An [animated ref](/docs/core/useAnimatedRef#returns) connected to the component you'd want to update. The animated ref has to be passed either to an [Animated component](/docs/fundamentals/glossary#animated-component) or a React Native built-in component.

#### `commandName`

The name of the command to execute, e.g. `'focus'` or `'scrollToEnd'`.

#### `args`&#x20;

The array of command arguments. Defaults to an empty array.

## Example

## Remarks

* Commands differ from component to component. Check relevant sources i.e. React Native documentation on [components](https://reactnative.dev/docs/components-and-apis) to see which commands are available.

## Platform compatibility
