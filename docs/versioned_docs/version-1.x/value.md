---
id: value
title: Value
sidebar_label: Value
---

`Animated.Value` is a container for storing values. It's is initialized with `new Value(0)` constructor. For backward compatibility there are provided API for setting value after it has been initialized:

```js
const v = new Value(0);
/// ...
v.setValue(100);
```

While using `Animated.Value` in functional components it's recommended that one should wrap instantiation with `useRef(...)` or `useMemo(...)` to use the same instance on re-render, or just simply use `useValue` hook:

```js
const v = useValue(0);
/// ...
v.setValue(100);
```
