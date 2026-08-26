# Changelog

## Unpublished

<!-- Add a concise entry under the appropriate category. Include links to the pull request and author when available. -->

### 🛠 Breaking changes

- `AnimatedRefOnUI` is now a `ShareableHost<ShadowNodeWrapper | null>` read with `.value` instead of a callable, and `AnimatedRefOnJS` was renamed to `AnimatedRefOnRN`. `measure` on an unmounted ref now returns `null` and warns instead of calling into `_measure`. ([#10413](https://github.com/software-mansion/react-native-reanimated/pull/10413) by [@tjzel](https://github.com/tjzel))
- Remove the `USE_SYNCHRONIZABLE_FOR_MUTABLES` feature flag. Mutables always use Synchronizable state now. ([#10298](https://github.com/software-mansion/react-native-reanimated/pull/10298) by [@tjzel](https://github.com/tjzel))

### 🎉 New features

### 🐛 Bug fixes

- Fix a transform string with leading whitespace throwing instead of parsing. ([#10388](https://github.com/software-mansion/react-native-reanimated/pull/10388) by [@dennytosp](https://github.com/dennytosp))
- Fix animated styles on sticky headers throwing an immutable-object mutation error in development. ([#10389](https://github.com/software-mansion/react-native-reanimated/pull/10389) by [@ngocdevv](https://github.com/ngocdevv))
- Fix shared element transitions never running on Android for npm installs by publishing `react-native.config.js`, which registers the Shared Transition Boundary component descriptor for autolinking. ([#10375](https://github.com/software-mansion/react-native-reanimated/pull/10375) by [@dennytosp](https://github.com/dennytosp))
- Keep exiting views at their position in the host tree, so they no longer draw above later siblings. ([#10392](https://github.com/software-mansion/react-native-reanimated/pull/10392) by [@pawicao](https://github.com/pawicao))

### 💡 Others

- Add `fontVariationSettings` to the style properties config, so the package type-checks against React Native 0.88 ([#10239](https://github.com/software-mansion/react-native-reanimated/pull/10239) by [@tjzel](https://github.com/tjzel))
- Add `backgroundPosition`, `backgroundRepeat` and `backgroundSize` to the style properties config, so the package type-checks against React Native 0.88. ([#10354](https://github.com/software-mansion/react-native-reanimated/pull/10354) by [@tjzel](https://github.com/tjzel))
- Migrate Mutable's dirty flag to Fixed Synchronizable for better performance. ([#10272](https://github.com/software-mansion/react-native-reanimated/pull/10272) by [@tjzel](https://github.com/tjzel))
