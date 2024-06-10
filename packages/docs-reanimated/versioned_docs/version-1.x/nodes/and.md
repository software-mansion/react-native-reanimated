## `and`

```js
and(nodeOrValue1, ...)
```

Acts as a logical `AND` operator. Takes one or more nodes as an input and evaluates them in sequence until some node evaluates to a "falsy" value. Then returns that value and stops evaluating further nodes. If all nodes evaluate to a "truthy" it returns the last node's value.
