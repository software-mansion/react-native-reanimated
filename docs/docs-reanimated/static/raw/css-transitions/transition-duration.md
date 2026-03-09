# transitionDuration

`transitionDuration` lets you specify the length of time the transition lasts. Defaults to `0`.

## Reference

```javascript
function App() {
  return (
    <Animated.View
      style={{
        transitionProperty: 'fontSize',
        // highlight-next-line
        transitionDuration: 500,
      }}
    />
  );
}
```

Type definitions

```typescript
type TimeUnit = `${number}s` | `${number}ms` | number;

type CSSTransitionDuration = TimeUnit | TimeUnit[];
```

### Values

#### `<time unit>`

A value which is either:

* A string which is a non-negative number followed by `s`. Represents a time in seconds.

```typescript
transitionDuration: '3s';
```

* A string which is a non-negative number followed by `ms`. Represents a time in milliseconds.

```typescript
transitionDuration: '150ms';
```

* A non-negative number which represents a time in milliseconds.

```typescript
transitionDuration: 500;
```

#### `<time unit[]>`

An array of time units. The order in this array corresponds to the array of style properties passed to the [`transitionProperty`](/docs/css-transitions/transition-property#style-property-1).

```typescript
// highlight-next-line
transitionDuration: ['3s', '150ms', 500];
transitionProperty: ['width', 'transform', 'borderRadius'];
```

In the following example, it would take 3 seconds for the `width` property to transition, 100 milliseconds for the `transform`, and 500 milliseconds for the `borderRadius`.

## Example

## Platform compatibility
