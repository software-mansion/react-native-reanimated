Fix the last `FlatList` item disappearing for one frame during an item-removal layout animation on Android. Views with an active layout animation are now excluded from `removeClippedSubviews` clipping until the animation ends. Requires the React Native change that adds `ReactClippingViewGroupHelper.setExcludedFromClipping`.
pr: 10487
