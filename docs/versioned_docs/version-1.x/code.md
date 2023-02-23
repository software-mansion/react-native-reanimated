---
id: code
title: Animated.Code
sidebar_label: Animated.Code
---

`Animated.Code` component allows you to define reanimated nodes that you want to execute when their input nodes updates, but aren't necessarily strictly related to some view properties and hence it does not feel right to place them under `translate` or other prop of an `Animated.View`. This component renders `null`, so you can place it in any place you want in your render method. It is required that your code is put inside component as we rely on `componentDidMount` and `componentWillUnmount` callbacks to install and cleanup animated nodes. Note that the code you put is going to be executed only once. We currently have no way of telling if your code changes and so it will only be run in `componentDidMount`. If you wish for your reanimated nodes to be updated when the component updates, you can update the `key` property of the `Animated.Code` component, which will effectively unmount old and mount new versions of it in the React tree. You can provide `dependencies` key which works just like second argueent in `useCode`.

```js
<Animated.Code>
  {() =>
    block([
      set(this.transX1, add(multiply(-1, this._transX))),
      set(this.transX2, add(multiply(-2, this._transX), 120)),
      set(this.transX3, sub(multiply(2, this._transX), 120)),
      set(this.transX4, add(multiply(1, this._transX))),
    ])
  }
</Animated.Code>
```

or:

```js
<Animated.Code
  exec={block([
    set(this.transX1, add(multiply(-1, this._transX))),
    set(this.transX2, add(multiply(-2, this._transX), 120)),
    set(this.transX3, sub(multiply(2, this._transX), 120)),
    set(this.transX4, add(multiply(1, this._transX))),
  ])}
/>
```

## `Animated.useCode`

The `useCode` hook acts as an alternative to the `Animated.Code` component.

```js
Animated.useCode(
    () => Node | Node[] | boolean | null | undefined,
    [...dependencies]
)
```

It's passed as 1st parameter a factory function that should return an optional animated node, or array of nodes (which will be then placed in a `block` node), and as 2nd parameter, an array of dependencies. It will update that node, both when the component mounts and every time a value in that array changes. It does nothing on versions of React Native that don't support hooks (<0.59).

```js
const [animated, setAnimated] = React.useState(false);
const [offset, setOffset] = React.useState(20);

Animated.useCode(
  () =>
    animated && [
      //...
      set(transX1, add(_transX, offset)),
    ],
  [animated, offset]
);
```

We recommend to use `useCode()` with the `react-hooks/exhaustive-deps` [eslint rule](https://www.npmjs.com/package/eslint-plugin-react-hooks).
