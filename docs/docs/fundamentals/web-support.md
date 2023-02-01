---
id: web-support
title: Web Support
sidebar_label: Web Support
---

Since the
[2.0.0-alpha.7](https://github.com/software-mansion/react-native-reanimated/releases/tag/2.0.0-alpha.7)
release it's possible to launch reanimated 2 in a web browser. For that case all of the functionalities are implemented purely in javascript, hence the efficiency of the animations might drop.

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
  entry: [
    'babel-polyfill', 
    './index.js'
  ],
  plugins: [
    new HtmlWebpackPlugin({
      filename: 'index.html',
      template: './index.html',
    }),
    new webpack.EnvironmentPlugin({ JEST_WORKER_ID: null }),
    new webpack.DefinePlugin({ process: { env: {} } })
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
              { plugins: ['@babel/plugin-proposal-class-properties'] }
            ],
          },
        },
      },
    ],
  },
  resolve: {
    alias: { 'react-native$': 'react-native-web', },
    extensions: ['.web.js', '.js'],
  },
};
```

## Web without a Babel plugin

As of Reanimated `2.15`, the Babel plugin is optional on Web. Specifically, this refers to `react-native-reanimated/plugin`.

If you're using Babel, then you should still use the plugin. However, if you're using Next.js, which relies on SWC instead of Babel, then this section may be for you.

In order to use Reanimated on Web without a Babel/SWC plugin, you need to pass a dependency array whenever you use one of the following Reanimated hooks:

- `useDerivedValue`
- `useAnimatedStyle`
- `useAnimatedProps`
- `useAnimatedReaction`

For example:

```ts
const sv = useSharedValue(0);
const dv = useDerivedValue(() => sv.value + 1, [sv]); // dep array here
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

## Next.js Compatibility

There is an experimental SWC plugin in the works. However, given that this may not work properly, you can use the ["Web without a Babel plugin"](#web-without-a-babel-plugin) instructions above.
