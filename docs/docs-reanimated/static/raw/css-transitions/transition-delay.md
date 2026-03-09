# transitionDelay

`transitionDelay` lets you specify the length of time to wait before transition starts. Defaults to `0`.

## Reference

```javascript
function App() {
  return (
    <Animated.View
      style={{
        transitionProperty: 'borderRadius',
        transitionDuration: 500,
        // highlight-next-line
        transitionDelay: '300ms',
      }}
    />
  );
}
```

Type definitions

```typescript
type TimeUnit = `${number}s` | `${number}ms` | number;

type CSSTransitionDelay = TimeUnit | TimeUnit[];
```

### Values

#### `<time unit>`

A value which is either:

* A string which is a number followed by `s`. Represents a time in seconds.

```typescript
transitionDelay: '3s';
```

* A string which is a number followed by `ms`. Represents a time in milliseconds.

```typescript
transitionDelay: '-150ms';
```

* A number which represents a time in milliseconds.

```typescript
transitionDelay: 500;
```

#### `<time unit[]>`

An array of time units. The order in this array corresponds to the array of style properties passed to the [`transitionProperty`](/docs/css-transitions/transition-property#style-property-1).

```typescript
// highlight-next-line
transitionDelay: ['3s', '-150ms', 500];
transitionProperty: ['width', 'transform', 'borderRadius'];
```

In the following example, the `width` property to transition will be delayed by 3 seconds for, `transform` will start immediately and skip the first 150 milliseconds of the transition, and `borderRadius` will be delayed by 500 milliseconds.

## Example

## Remarks

* A negative delay causes the transition to begin immediately, but partway through its cycle. For example, if your transition lasts for 10 seconds and you set `transitionDelay` to `-5s`, the transition starts in the halfway of its length.

## Platform compatibility
