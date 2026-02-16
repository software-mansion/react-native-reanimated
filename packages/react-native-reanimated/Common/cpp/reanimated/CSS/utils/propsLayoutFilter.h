#pragma once

#include <reanimated/CSS/utils/propNameFromString.h>

#include <react/featureflags/ReactNativeFeatureFlags.h>
#include <react/renderer/animationbackend/AnimatedProps.h>
#include <react/renderer/animationbackend/AnimationBackend.h>
#include <react/renderer/core/RawProps.h>

#include <folly/dynamic.h>

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

inline bool mutationHasLayoutUpdates(const facebook::react::AnimatedProps &animatedProps) {
  for (const auto &prop : animatedProps.props) {
    if (isLayoutProp(prop->propName)) {
      return true;
    }
  }

  if (!animatedProps.rawProps) {
    return false;
  }

  const auto rawPropsDynamic = animatedProps.rawProps->toDynamic();
  for (const auto &key : rawPropsDynamic.keys()) {
    if (!key.isString()) {
      continue;
    }

    const auto propName = propNameFromString(key.asString());
    if (propName.has_value() && isLayoutProp(propName.value())) {
      return true;
    }
  }

  return false;
}

} // namespace reanimated::css
