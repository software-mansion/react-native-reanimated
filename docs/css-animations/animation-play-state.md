# animationPlayState

`animationPlayState` lets you play and pause the animation. Defaults to `running`.

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
        animationDuration: '2s',
        // highlight-next-line
        animationPlayState: 'paused',
      }}
    />
  );
}
```

Type definitions

```typescript
type CSSAnimationPlayState = 'running' | 'paused';

animationPlayState: CSSAnimationPlayState | CSSAnimationPlayState[];
```

### Values

#### `running`

The animation is running.

#### `paused`

The animation is paused.

#### `<animation play state[]>`

An array of animation play state values. The order in this array corresponds to the array of style properties passed to the [`animationName`](/docs/css-animations/animation-name).

```javascript
// highlight-next-line
animationPlayState: ['paused', 'running'];
animationName: [bounceIn, move];
```

In the following example, `bounceIn` animation would be pauses, `move` would be running.

## Platform compatibility
