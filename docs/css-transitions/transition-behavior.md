# transitionBehavior

`transitionBehavior` lets you determine whether the transition is applied to discrete properties. Defaults to `normal` which transitions only continuous properties and discards discrete properties.

## Reference

```javascript
function App() {
  return (
    <Animated.View
      style={{
        transitionProperty: 'alignItems',
        transitionDuration: 500,
        // highlight-next-line
        transitionBehavior: 'allow-discrete',
      }}
    />
  );
}
```

Type definitions

```typescript
type CSSTransitionBehavior = 'normal' | 'allow-discrete';
```

### Values

#### `allow-discrete`

Allows transitions to be applied to discrete properties, resulting in delayed changes.

#### `normal`

Doesn't allow transitions to be applied to discrete properties, resulting in changes applied immediately.

## Example

## Remarks

* Discrete style properties (like `flexDirection`, `justifyContent`) can't be smoothly animated using the `transitionProperty` property. For example, you can't animate smoothly from `alignItems: start` to `alignItems: center`. You can use [Layout Animations](/docs/layout-animations/layout-transitions) to animate discrete style properties instead.

* When using `allow-discrete` the discrete properties flip between two values at the midpoint of the animation, except for the `display` property, which is immediately at the moment of the transition start.

## Platform compatibility
