## `SpringUtils`

For developers' convenience, it's possible to use a different way of configuring `spring` animation which follows behavior known from React Native core.

### `SpringUtils.makeDefaultConfig()`

Returns an object filled with default config of animation:

```js
 {
   stiffness: new Value(100),
   mass: new Value(1),
   damping: new Value(10),
   overshootClamping: false,
   restSpeedThreshold: 0.001,
   restDisplacementThreshold: 0.001,
   toValue: new Value(0),
 }
```

### `SpringUtils.makeConfigFromBouncinessAndSpeed(prevConfig)`

Transforms an object with `bounciness` and `speed` params into config expected by the `spring` node. `bounciness` and `speed` might be nodes or numbers.

### `SpringUtils.makeConfigFromOrigamiTensionAndFriction(prevConfig)`

Transforms an object with `tension` and `friction` params into config expected by the `spring` node. `tension` and `friction` might be nodes or numbers.

See an [Example of different configs](https://github.com/software-mansion/react-native-reanimated/blob/master/Example/src/differentSpringConfigs/index.js).
