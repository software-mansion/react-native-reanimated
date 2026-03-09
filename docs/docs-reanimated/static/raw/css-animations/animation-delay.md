# animationDelay

`animationDelay` lets you specify the length of time to wait before animation starts. Defaults to `0`.

## Reference

```javascript
function App() {
  return (
    <Animated.View
      style={{
        animationName: {
          '100%': {
            transform: [{ rotateZ: '180deg' }],
          },
        },
        animationDuration: '100ms',
        // highlight-next-line
        animationDelay: 500,
      }}
    />
  );
}
```

Type definitions

```typescript
type TimeUnit = `${number}s` | `${number}ms` | number;

type CSSAnimationDelay = TimeUnit | TimeUnit[];
```

### Values

#### `<time unit>`

A value which is either:

* A string which is a number followed by `s`. Represents a time in seconds.

```typescript
animationDelay: '3s';
```

* A string which is a number followed by `ms`. Represents a time in milliseconds.

```typescript
animationDelay: '-150ms';
```

* A number which represents a time in milliseconds.

```typescript
animationDelay: 500;
```

#### `<time unit[]>`

An array of time units. The order in this array corresponds to the array of style properties passed to the [`animationName`](/docs/css-animations/animation-name).

```typescript
// highlight-next-line
animationDelay: ['3s', '-150ms', 500];
animationName: [bounceIn, move, slide];
```

In the following example, `bounceIn` keyframe would be delayed by 3 seconds, `move` would start 150 milliseconds into the animation, and `slide` would be delayed by 500 milliseconds.

## Example

## Remarks

* A negative delay causes the animation to begin immediately, but partway through its cycle. For example, if your animation lasts for 10 seconds and you set `animationDelay` to `-5s`, the animation starts in the halfway of its length.

## Platform compatibility
