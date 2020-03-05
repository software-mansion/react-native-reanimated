## Disclaimer

This is a copy of example app from [react-native-interactable](https://github.com/wix/react-native-interactable/tree/master/playground) project.

There are several changes made to the files here:
 - index.js has been added to list all the samples such that they can be presented as react-navigation screens
 - all imports of `react-native-interactable` has been replaced and instead `Interactable.js` is loaded from the main folder of the Example app
 - whenever `Interactable.View` is used with `Animated.Value` we replace importing `Animated` from `react-native` and import `react-native-reaminated` instead
 - in `RealChatHeads.js` we modified timing animation to include `easing` as a config parameter as `reanimated` does not currently have a default value for that
 - in `TinderCard.js` we modified rotation interpolation not to include strings in `output` array but instead is wrapped in a `concat` node to append `deg` at the end. This is necessary as reanimated version of interpolate does not support interpolating strings this way.
 - finally there is a chance some (if not all) of the files has been reformatted by prettier
