## `proc`

Returns a callable function node that can be used to define expressions that can be called from other nodes.

Example:

```js
// Global constant
const myProc = proc((a, b) => multiply(a, b));

// In your component
const style = { width: myProc(10, 10) };
```

A proc node should be declared as a global constant in your code and not recreated from inside components.

It is not possible to reference nodes that are not passed as parameters.
