---
id: web-support
title: Web Support
sidebar_label: Web Support
---

Since
[2.0.0-alpha.7](https://github.com/software-mansion/react-native-reanimated/releases/tag/2.0.0-alpha.7)
release it's possible to launch reanimated 2 in a web browser. For that case all of the functionalities are implemented purely in javascript, hence the efficiency of the animations might drop.

If you use
[playground](https://github.com/software-mansion-labs/reanimated-2-playground)
and want to start the app in the browser, just type:
```shell
yarn web
```

If you want to start example applications from the 
[reanimated repository](https://github.com/software-mansion/react-native-reanimated)
you need to run a following command inside the `Example` directory:
```shell
yarn start-web
```

## Webpack support

If you want to use Reanimated in `webpack` app you should add extra configuration to your `webpack` config.

Example webpack config file with Reanimated support:

```js {6,14,34}
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