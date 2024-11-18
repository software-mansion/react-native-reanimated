## `stopClock`

```js
stopClock(clockNode);
```

When evaluated, it will stop evaluating nodes dependent on `clockNode`.

**NOTE**
The clock, even after using `stopClock` on it, will keep updating it's value. `stopClock` merely prevents other nodes from evaluation when clock updates.
To save the moment when clock was stopped please use `Value`.
