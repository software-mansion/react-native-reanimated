---
id: getting_started
title: Getting started
sidebar_label: Getting started
---

Before you get started you should definitely familiarize yourself with the original [Animated API](https://facebook.github.io/react-native/docs/animated.html). It will do you well to be comfortable with how animations are generally done in `Animated`. (Fun Fact: Reanimated is also backwards compatible with the `Animated API`. 🙌)

Refer to the [Motivation](about.md#motivation) section to understand why this library exists

NOTE: Throughout this document when we refer to classes or methods prefixed with `Animated` we are referring to them being imported from `react-native-reanimated` package instead of plain `react-native`, unless otherwise stated.

## Installation

I. First install the library from npm repository using `yarn`:

```bash
  yarn add react-native-reanimated
```

II. For iOS, go to `ios` folder and run `pod install`:

```bash
  cd ios
  pod install
```

III. When you want to use "reanimated" in your project import it from the `react-native-reanimated` package:

```js
import Animated from 'react-native-reanimated';
```

Similarly when you need `Easing` import it from the `react-native-reanimated` package instead of `react-native`:

```js
import Animated, { Easing } from 'react-native-reanimated';
```

## Testing

In order to use `react-native-reanimated` with Jest, you need to add the following mock implementation at the top of your test:

```js
jest.mock('react-native-reanimated', () =>
  require('react-native-reanimated/mock')
);
```
