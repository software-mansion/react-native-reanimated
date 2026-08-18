# Changelog

## Unpublished

<!-- Add a concise entry under the appropriate category. Include links to the pull request and author when available. -->

### 🛠 Breaking changes

### 🎉 New features

- Add `contrastColor` worklet that returns `'white'` or `'black'`, whichever has the higher WCAG contrast ratio against a given color, mirroring CSS `contrast-color()`. ([#10320](https://github.com/software-mansion/react-native-reanimated/pull/10320) by [@tomekzaw](https://github.com/tomekzaw))

### 🐛 Bug fixes

- Fix `EXC_BAD_ACCESS` crash in `-[REANodesManager performOperations]` when called before the `_performOperations` block is registered on iOS. ([#10229](https://github.com/software-mansion/react-native-reanimated/pull/10229) by [@tomekzaw](https://github.com/tomekzaw))
- Fix missing unmount of ancestors of animated components with exiting animations in experimental Layout Animations Proxy ([#10103](https://github.com/software-mansion/react-native-reanimated/pull/10103) by [@pawicao](https://github.com/pawicao))
- Fix crash when a CSS animation or transition runs between two keyword values on a property that also accepts relative lengths, such as `width` going from `auto` to `auto`. ([#10281](https://github.com/software-mansion/react-native-reanimated/pull/10281) by [@MatiPl01](https://github.com/MatiPl01))
- Fix Android flashes at the start of entering animations in experimental Layout Animations Proxy by temporarily setting opacity 0 at the start of an insert mutation ([#10198](https://github.com/software-mansion/react-native-reanimated/pull/10198) by [@pawicao](https://github.com/pawicao))
- Fix layout animations getting out of sync across many simultaneously animated views ([#10317](https://github.com/software-mansion/react-native-reanimated/pull/10317) by [@pawicao](https://github.com/pawicao))

### 💡 Others

- Use Worklets' `isOnUIThread` Stable API when scheduling Layout Animations cleanup on Android.
