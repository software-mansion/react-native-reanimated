`itemLayoutAnimation` lets you define a [layout transition](/docs/layout-animations/layout-transitions) that's applied when list items layout changes. You can use one of the [predefined transitions](/docs/layout-animations/layout-transitions#predefined-transitions) like `LinearTransition` or create [your own transition](/docs/layout-animations/custom-animations#custom-layout-transition).

## Example

```jsx
import Animated, { LinearTransition } from 'react-native-reanimated';

function App() {
  return (
    <Animated.FlatList
      data={data}
      renderItem={renderItem}
      // highlight-next-line
      itemLayoutAnimation={LinearTransition}
    />
  );
}
```

## Remarks

* `itemLayoutAnimation` works only with a single-column `Animated.FlatList`, `numColumns` property cannot be greater than 1.
* You can change the `itemLayoutAnimation` on the fly or disable it by setting it to `undefined`.

```jsx
function App() {
  const [transition, setTransition] = useState(LinearTransition);

  const changeTransition = () => {
    // highlight-start
    setTransition(
      transition === LinearTransition ? JumpingTransition : LinearTransition
    );
    // highlight-end
  };

  const toggleTransition = () => {
    // highlight-next-line
    setTransition(transition ? undefined : LinearTransition);
  };

  return (
    <Animated.FlatList
      data={data}
      renderItem={renderItem}
      // highlight-next-line
      itemLayoutAnimation={transition}
    />
  );
}
```

* If the list items contain neither a `key` nor `id` property (which are used by default by the FlatList [keyExtractor](https://reactnative.dev/docs/flatlist#keyextractor) to create list item keys), you must provide your own implementation of the `keyExtractor` function that returns a unique key for each list item.

```jsx
function App() {
  return (
    <Animated.FlatList
      data={data}
      renderItem={renderItem}
      itemLayoutAnimation={LinearTransition}
      // highlight-next-line
      keyExtractor={customKeyExtractor}
    />
  );
}
```

## Platform compatibility
