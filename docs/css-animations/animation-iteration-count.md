# animationIterationCount

`animationIterationCount` lets you repeat an animation given number of times or run it indefinitely. Default to `1`.

## Reference

```javascript
function App() {
  return (
    <Animated.View
      style={{
        animationName: {
          from: { width: 120 },
          to: { width: 240 },
        },
        animationDuration: '1s',
        // highlight-next-line
        animationIterationCount: 'infinite',
        animationDirection: 'alternate',
      }}
    />
  );
}
```

Type definitions

```typescript
type CSSAnimationIterationCount = 'infinite' | number;

animationIterationCount: CSSAnimationIterationCount | CSSAnimationIterationCount[];
```

### Values

#### `infinity`

Animation will repeat forever.

#### `<number>`

A non-negative number specifying how many times the animation will repeat.

#### `<animation iteration count[]>`

An array of animation iteration count values. The order in this array corresponds to the array of style properties passed to the [`animationName`](/docs/css-animations/animation-name).

```typescript
// highlight-next-line
animationIterationCount: ['infinity', 1, 60];
animationName: [bounceIn, move, slide];
```

In the following example, `bounceIn` keyframe would run indefinitely, `move` would run once, and `slide` would repeat 60 times.

## Example

## Remarks

* You can also provide non-integer values. For example, passing `0.5` will play half of the animation cycle.

## Platform compatibility
