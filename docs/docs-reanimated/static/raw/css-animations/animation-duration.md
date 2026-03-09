# animationDuration

`animationDuration` lets you specify the length of time the animation lasts. Defaults to `0`.

## Reference

```javascript
function App() {
  return (
    <Animated.View
      style={{
        animationName: {
          to: {
            transform: [{ scale: 2 }],
          },
        },
        // highlight-next-line
        animationDuration: 500,
      }}
    />
  );
}
```

Type definitions

```typescript
type TimeUnit = `${number}s` | `${number}ms` | number;

type CSSAnimationDuration = TimeUnit | TimeUnit[];
```

### Values

#### `<time unit>`

A value which is either:

* A string which is a non-negative number followed by `s`. Represents a time in seconds.

```typescript
animationDuration: '3s';
```

* A string which is a non-negative number followed by `ms`. Represents a time in milliseconds.

```typescript
animationDuration: '150ms';
```

* A non-negative number which represents a time in milliseconds.

```typescript
animationDuration: 500;
```

#### `<time unit[]>`

An array of time units. The order in this array corresponds to the array of style properties passed to the [`animationName`](/docs/css-animations/animation-name).

```typescript
// highlight-next-line
animationDuration: ['3s', '150ms', 500];
animationName: [bounceIn, move, slide];
```

In the following example, it would take 3 seconds for the `bounceIn` keyframe to animate, 100 milliseconds for the `move`, and 500 milliseconds for the `slide`.

## Example

## Platform compatibility
