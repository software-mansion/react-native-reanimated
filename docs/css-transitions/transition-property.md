# transitionProperty

`transitionProperty` lets you specify the name or names of styles properties to transition.

## Reference

```javascript
function App() {
  return (
    <Animated.View
      style={{
        // highlight-next-line
        transitionProperty: 'width',
        transitionDuration: 300,
      }}
    />
  );
}
```

Type definitions

```typescript
import type { ImageStyle, TextStyle, ViewStyle } from 'react-native';

type PlainStyle = ViewStyle & TextStyle & ImageStyle;

type CSSTransitionProperty<S extends object = PlainStyle> =
  | 'all'
  | 'none'
  | keyof S
  | ('all' | keyof S)[];
```

### Values

#### `<style property>`

A string which is a single style property to transition when it's value changes.

```typescript
transitionProperty: 'backgroundColor';
```

#### `<style property>[]`

An array of strings which are properties to transition when their values changes.

```typescript
transitionProperty: ['borderWidth', 'borderColor'];
```

#### `all`

Every property that can be transitioned will be.

#### `none`

No properties will transition.

## Example

## Remarks

* You need to use the [`transitionDuration`](/docs/css-transitions/transition-duration) alongside the `transitionProperty` to create transitions.

* The property that you want to transition using `transitionProperty` needs to be applied to the same component.

* Discrete style properties (like `flexDirection`, `justifyContent`) can't be smoothly animated using the `transitionProperty` property. For example, you can't animate smoothly from `alignItems: start` to `alignItems: center`. You can use [Layout Animations](/docs/layout-animations/layout-transitions) to animate discrete style properties instead.

* We discourage the use of `all` property as it can lead to performance issues.

## Platform compatibility
