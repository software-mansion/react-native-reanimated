## `or`

```js
or(nodeOrValue1, ...)
```

Acts as a logical `OR` operator. Takes one or more nodes as an input and evaluates them in sequence until some node evaluates to a "truthy" value. Then returns that value and stops evaluating further nodes. If all nodes evaluate to a "falsy" value it returns the last node's value.
