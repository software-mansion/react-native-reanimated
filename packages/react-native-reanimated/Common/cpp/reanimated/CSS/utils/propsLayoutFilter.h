#pragma once

#include <react/featureflags/ReactNativeFeatureFlags.h>
#include <react/renderer/animationbackend/AnimationBackend.h>

#include <set>

namespace reanimated::css {

// On Android, non-layout props need to be packed into the rawProps unless props 2.0 are enabled.
inline bool shouldFilterNonLayoutProps() {
#ifdef ANDROID
  return !facebook::react::ReactNativeFeatureFlags::enablePropsUpdateReconciliationAndroid();
#else
  return false;
#endif
}

inline const std::set<facebook::react::PropName> &layoutPropNames() {
  static const std::set<facebook::react::PropName> props = {
      facebook::react::WIDTH,
      facebook::react::HEIGHT,
      facebook::react::FLEX,
      facebook::react::MARGIN,
      facebook::react::PADDING,
      facebook::react::POSITION,
      facebook::react::BORDER_WIDTH,
      facebook::react::ALIGN_CONTENT,
      facebook::react::ALIGN_ITEMS,
      facebook::react::ALIGN_SELF,
      facebook::react::ASPECT_RATIO,
      facebook::react::BOX_SIZING,
      facebook::react::DISPLAY,
      facebook::react::FLEX_BASIS,
      facebook::react::FLEX_DIRECTION,
      facebook::react::ROW_GAP,
      facebook::react::COLUMN_GAP,
      facebook::react::FLEX_GROW,
      facebook::react::FLEX_SHRINK,
      facebook::react::FLEX_WRAP,
      facebook::react::JUSTIFY_CONTENT,
      facebook::react::MAX_HEIGHT,
      facebook::react::MAX_WIDTH,
      facebook::react::MIN_HEIGHT,
      facebook::react::MIN_WIDTH,
      facebook::react::STYLE_OVERFLOW,
      facebook::react::POSITION_TYPE,
      facebook::react::DIRECTION,
      facebook::react::Z_INDEX,
  };

  return props;
}

inline bool isLayoutProp(facebook::react::PropName propName) {
  return layoutPropNames().contains(propName);
}

inline bool shouldSkipNonLayoutProp(facebook::react::PropName propName) {
  if (shouldFilterNonLayoutProps()) {
    return !isLayoutProp(propName);
  }
  return false;
}

} // namespace reanimated::css
