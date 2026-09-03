# Changelog

## Unpublished

<!-- Add a concise entry under the appropriate category. Include links to the pull request and author when available. -->

### 🛠 Breaking changes

- `AnimatedRefOnUI` is now a `ShareableHost<ShadowNodeWrapper | null>` read with `.value` instead of a callable, and `AnimatedRefOnJS` was renamed to `AnimatedRefOnRN`. `measure` on an unmounted ref now returns `null` and warns instead of calling into `_measure`. ([#10413](https://github.com/software-mansion/react-native-reanimated/pull/10413) by [@tjzel](https://github.com/tjzel))
- Remove the `USE_SYNCHRONIZABLE_FOR_MUTABLES` feature flag. Mutables always use Synchronizable state now. ([#10298](https://github.com/software-mansion/react-native-reanimated/pull/10298) by [@tjzel](https://github.com/tjzel))

### 🎉 New features

### 🐛 Bug fixes

- Reset `IN_STYLE_UPDATER` even when an initial style updater throws, so a single updater error no longer leaves all animations returning raw values until reload. ([#10445](https://github.com/software-mansion/react-native-reanimated/pull/10445) by [@alexey-khatskelevich](https://github.com/alexey-khatskelevich))
- Fix `./gradlew app:build` failing on `:lintAnalyzeDebug` with a K2 UAST crash on `.gradle.kts` build scripts - all lint tasks are now skipped, not only `lintVital*`. ([#10448](https://github.com/software-mansion/react-native-reanimated/pull/10448) by [@tshmieldev](https://github.com/tshmieldev))
- Treat `animationName: []` as no animation, so the view is detached instead of running its previous animation forever. ([#10432](https://github.com/software-mansion/react-native-reanimated/pull/10432) by [@MatiPl01](https://github.com/MatiPl01))
- Fix `SequencedTransition` on web scaling the wrong axis in its midpoint keyframe, so the axis that has already finished no longer collapses while the other one waits. ([#10384](https://github.com/software-mansion/react-native-reanimated/pull/10384) by [@dennytosp](https://github.com/dennytosp))
- Fix native gestures (e.g. scrolling) not working inside `SharedTransitionBoundary` on Android by growing the boundary's zero-sized frame to cover its children. ([#10430](https://github.com/software-mansion/react-native-reanimated/pull/10430) by [@bartlomiejbloniarz](https://github.com/bartlomiejbloniarz))
- Fix `normalizeColor` resolving `Object.prototype` members such as `'constructor'` and `'toString'` as color names and returning a function instead of `null`. ([#10387](https://github.com/software-mansion/react-native-reanimated/pull/10387) by [@dennytosp](https://github.com/dennytosp))
- Fix `transform` and `transformOrigin` strings padded with whitespace throwing instead of parsing. ([#10388](https://github.com/software-mansion/react-native-reanimated/pull/10388) by [@dennytosp](https://github.com/dennytosp))
- Fix `linear()` easing not clamping an out-of-order input progress value on its first or last control point, which left the control points non-monotonic and the resulting curve wrong. ([#10380](https://github.com/software-mansion/react-native-reanimated/pull/10380) by [@dennytosp](https://github.com/dennytosp))
- Fix fractional millisecond CSS time values, which were truncated (`16.67ms` became `16`) or read as `NaN` when written without a leading zero (`.5ms`). ([#10381](https://github.com/software-mansion/react-native-reanimated/pull/10381) by [@dennytosp](https://github.com/dennytosp))
- Fix animated styles on sticky headers throwing an immutable-object mutation error in development. ([#10389](https://github.com/software-mansion/react-native-reanimated/pull/10389) by [@ngocdevv](https://github.com/ngocdevv))
- Fix shared element transitions never running on Android for npm installs by publishing `react-native.config.js`, which registers the Shared Transition Boundary component descriptor for autolinking. ([#10375](https://github.com/software-mansion/react-native-reanimated/pull/10375) by [@dennytosp](https://github.com/dennytosp))
- Keep exiting views at their position in the host tree, so they no longer draw above later siblings. ([#10392](https://github.com/software-mansion/react-native-reanimated/pull/10392) by [@pawicao](https://github.com/pawicao))
- Fix Layout Animations ordering and mounted-frame convergence during config churn. ([#10373](https://github.com/software-mansion/react-native-reanimated/pull/10373) by [@bartlomiejbloniarz](https://github.com/bartlomiejbloniarz))
- Fix Experimental Layout Animations cleanup ordering on Android. ([#10372](https://github.com/software-mansion/react-native-reanimated/pull/10372) by [@bartlomiejbloniarz](https://github.com/bartlomiejbloniarz))
- Fix interactive Shared Transitions cancellation and progress lifecycle ordering. ([#10371](https://github.com/software-mansion/react-native-reanimated/pull/10371) by [@bartlomiejbloniarz](https://github.com/bartlomiejbloniarz))
- Fix Shared Transitions cleanup, restoration, and positioning in native-stack screens and modals. ([#10370](https://github.com/software-mansion/react-native-reanimated/pull/10370) by [@bartlomiejbloniarz](https://github.com/bartlomiejbloniarz))
- Fix Layout Animations replacement and completion ordering by centralizing native lifecycle operations. ([#10369](https://github.com/software-mansion/react-native-reanimated/pull/10369) by [@bartlomiejbloniarz](https://github.com/bartlomiejbloniarz))
- Fix Layout Animations state leaking between Fabric surfaces by using one proxy per surface. ([#10368](https://github.com/software-mansion/react-native-reanimated/pull/10368) by [@bartlomiejbloniarz](https://github.com/bartlomiejbloniarz))

### 💡 Others

- Add `fontVariationSettings` to the style properties config, so the package type-checks against React Native 0.88 ([#10239](https://github.com/software-mansion/react-native-reanimated/pull/10239) by [@tjzel](https://github.com/tjzel))
- Add `backgroundPosition`, `backgroundRepeat` and `backgroundSize` to the style properties config, so the package type-checks against React Native 0.88. ([#10354](https://github.com/software-mansion/react-native-reanimated/pull/10354) by [@tjzel](https://github.com/tjzel))
- Migrate Mutable's dirty flag to Fixed Synchronizable for better performance. ([#10272](https://github.com/software-mansion/react-native-reanimated/pull/10272) by [@tjzel](https://github.com/tjzel))
