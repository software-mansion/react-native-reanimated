In order to use the Reanimated's SWC plugin, you need to add it to your `.swcrc` file:

```js
{
  "jsc": {
    "experimental": {
      "plugins": [
        ["react-native-reanimated-swc-plugin"]
      ]
    }
  }
}
```

If you're using [Next.js](https://nextjs.org/docs/advanced-features/compiler#swc-plugins-experimental), you need to set the plugin in `next.config.js` instead:

```js
module.exports = {
  experimental: {
    swcPlugins: [['react-native-reanimated-swc-plugin']],
  },
};
```

Below is a table showing compatibility of the plugin. Please note that `swc_core` version refers to the version of the [`swc_core` crate](https://crates.io/crates/swc_plugin) that the plugin has been compiled against. The last column is the version of Next.js with that version of `swc_core` crate included.

| Plugin version | `swc_core` version | Next.js version |
| -------------- | ------------------ | --------------- |
| 0.1.0          | 0.40.13            | 13.0.0          |
| 0.2.0          | 0.43.23            | 13.0.5          |
