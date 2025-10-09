## `debug`

```js
debug(messageString, valueNode);
```

When the node is evaluated, it prints a string that contains the `messageString` concatenated with the value of `valueNode`. This then returns the value of `valueNode`. Logs are printed in the JS debugger if it's attached, in console if Expo client is being used, or else in the native console. Logs are visible only in `DEV` mode and have no effect on production builds. Note that `messageString` should be a normal string, not an animated node.
