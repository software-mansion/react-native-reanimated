# animationDirection

`animationDirection` lets you specify which direction the animation should run. Defaults to `normal`.

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
        animationIterationCount: 'infinite',
        // highlight-next-line
        animationDirection: 'alternate',
      }}
    />
  );
}
```

Type definitions

```typescript
type CSSAnimationDirection =
  | 'normal'
  | 'reverse'
  | 'alternate'
  | 'alternate-reverse';

animationDirection: CSSAnimationDirection | CSSAnimationDirection[];
```

### Values

#### `normal`

Runs the animation forwards.

#### `reverse`

Runs the animation backwards.

#### `alternate`

For each animation iteration, the animation alternates between running forwards and backwards.

#### `alternate-reverse`

For each animation iteration, the animation alternates between running forwards and backwards but the first iteration runs backwards.

#### `<animation direction[]>`

An array of animation direction values. The order in this array corresponds to the array of style properties passed to the [`animationName`](/docs/css-animations/animation-name).

```typescript
// highlight-next-line
animationDirection: ['alternate', 'normal', 'reverse'];
animationName: [bounceIn, move, slide];
```

In the following example, `bounceIn` keyframe would alternate between running forwards and backwards, `move` would run forwards, and `slide` would run in reverse.

## Example

## Platform compatibility
