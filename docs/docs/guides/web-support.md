---
id: web-support
title: Web Support
sidebar_label: Web Support
---

:::info
This page was ported from an old version of the documentation.

As we're rewriting the documentation some of the pages might be a little outdated.
:::

It's possible to launch Reanimated in a web browser. For that case all of the functionalities are implemented purely in JavaScript, hence the efficiency of the animations might be lower.

Reanimated for Web requires the following configuration steps. You need to add [`@babel/plugin-proposal-export-namespace-from`](https://babeljs.io/docs/en/babel-plugin-proposal-export-namespace-from) as well as Reanimated Babel plugin to your `babel.config.js`.

```bash
yarn add @babel/plugin-proposal-export-namespace-from
```

```js {5,6}
module.exports = {
  presets: [
      ...
  ],
  plugins: [
    ...
    '@babel/plugin-proposal-export-namespace-from',
    'react-native-reanimated/plugin',
  ],
};
```

If you use
[playground](https://github.com/software-mansion-labs/reanimated-2-playground)
app and want to start it in the browser just type:

```shell
yarn web
```

If you want to start the example applications from the
[reanimated repository](https://github.com/software-mansion/react-native-reanimated)
you need to run the following command inside the `Example` directory:

```shell
yarn start-web
```

## Webpack support

If you want to use Reanimated in a `webpack` app you should adjust your `webpack` config.

Example webpack config file with Reanimated support:

```js {6,14,15,34}
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');

module.exports = {
  entry: ['babel-polyfill', './index.js'],
  plugins: [
    new HtmlWebpackPlugin({
      filename: 'index.html',
      template: './index.html',
    }),
    new webpack.EnvironmentPlugin({ JEST_WORKER_ID: null }),
    new webpack.DefinePlugin({ process: { env: {} } }),
  ],
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              '@babel/preset-react',
              { plugins: ['@babel/plugin-proposal-class-properties'] },
            ],
          },
        },
      },
    ],
  },
  resolve: {
    alias: { 'react-native$': 'react-native-web' },
    extensions: ['.web.js', '.js'],
  },
};
```

## Web without the Babel plugin

It is possible to use Reanimated without the Babel plugin (`react-native-reanimated/plugin` on the Web, with some additional configuration.

Reanimated hooks all accept optional dependency arrays. Under the hood, the Reanimated Babel plugin inserts these for you.

In order to use Reanimated without a Babel/SWC plugin, you need to explicitly pass the dependency array whenever you use a Reanimated hook.

Passing a dependency array is valid on both Web and native. Adding them will not negatively impact iOS or Android.

Make sure the following hooks have a dependency array as the last argument:

- `useDerivedValue`
- `useAnimatedStyle`
- `useAnimatedProps`
- `useAnimatedReaction`

For example:

```ts
const sv = useSharedValue(0);
const dv = useDerivedValue(
  () => sv.value + 1,
  [sv] // dependency array here
);
```

Be sure to pass the dependency itself (`sv`) and not `sv.value` to the dependency array.

> Babel users will still need to install the `@babel/plugin-proposal-class-properties` plugin.

### ESLint Support

When you use hooks from React, they give you nice suggestions from ESLint to include all dependencies. In order to add this support to Reanimated hooks, add the following to your ESLint config:

```json
{
  "rules": {
    "react-hooks/exhaustive-deps": [
      "error",
      {
        "additionalHooks": "(useAnimatedStyle|useDerivedValue|useAnimatedProps)"
      }
    ]
  }
}
```

This assumes you've already installed the `react-hooks` eslint [plugin](https://www.npmjs.com/package/eslint-plugin-react-hooks).

If you're using ESLint autofix, the ESLint plugin may add `.value` to the dependency arrays, rather than the root dependency. In these cases, you should update the array yourself.

```tsx
const sv = useSharedValue(0);

// 🚨 bad, sv.value is in the array
const dv = useDerivedValue(() => sv.value, [sv.value]);

// ✅ good, sv is in the array
const dv = useDerivedValue(() => sv.value, [sv]);
```

## Solito / Next.js Compatibility

There is an experimental SWC plugin in the works. However, given that this may not work properly, you can use the ["Web without a Babel plugin"](#web-without-a-babel-plugin) instructions above.

### Next.js Polyfill

In order to use Reanimated with Next.js / Solito, you'll need to add the `raf` polyfill for `requestAnimationFrame` to not throw on the server:

```sh
yarn add raf
```

Add the following to the top of your `_app.tsx`:

```ts
import 'raf/polyfill';
```
