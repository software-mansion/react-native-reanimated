#pragma once

#include <jsi/jsi.h>

#include <cxxreact/ReactNativeVersion.h>

#if REACT_NATIVE_VERSION_MINOR >= 85
#include <react/featureflags/ReactNativeFeatureFlags.h>
#include <reanimated/Fabric/updates/propNameFromString.h>

#include <react/renderer/animationbackend/AnimatedProps.h>

#include <set>

namespace reanimated {

// On Android, non-layout props need to be packed into the rawProps unless props 2.0 are enabled.
inline bool shouldFilterNonLayoutProps() {
#ifdef ANDROID
  return !facebook::react::ReactNativeFeatureFlags::enablePropsUpdateReconciliationAndroid();
#else
  return false;
#endif
}

inline bool isLayoutProp(facebook::react::PropName propName) {
  static const std::set<facebook::react::PropName> layoutPropNames = {
      facebook::react::WIDTH,        facebook::react::HEIGHT,         facebook::react::FLEX,
      facebook::react::MARGIN,       facebook::react::PADDING,        facebook::react::POSITION,
      facebook::react::BORDER_WIDTH, facebook::react::ALIGN_CONTENT,  facebook::react::ALIGN_ITEMS,
      facebook::react::ALIGN_SELF,   facebook::react::ASPECT_RATIO,   facebook::react::BOX_SIZING,
      facebook::react::DISPLAY,      facebook::react::FLEX_BASIS,     facebook::react::FLEX_DIRECTION,
      facebook::react::ROW_GAP,      facebook::react::COLUMN_GAP,     facebook::react::FLEX_GROW,
      facebook::react::FLEX_SHRINK,  facebook::react::FLEX_WRAP,      facebook::react::JUSTIFY_CONTENT,
      facebook::react::MAX_HEIGHT,   facebook::react::MAX_WIDTH,      facebook::react::MIN_HEIGHT,
      facebook::react::MIN_WIDTH,    facebook::react::STYLE_OVERFLOW, facebook::react::POSITION_TYPE,
      facebook::react::DIRECTION,    facebook::react::Z_INDEX,
  };
  return layoutPropNames.contains(propName);
}

inline bool shouldSkipNonLayoutProp(facebook::react::PropName propName) {
  if (shouldFilterNonLayoutProps()) {
    return !isLayoutProp(propName);
  }
  return false;
}

inline bool animatedPropsContainLayoutProps(const facebook::react::AnimatedProps &animatedProps) {
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
    const auto propName = propNameFromString(key.asString());
    if (propName.has_value() && isLayoutProp(propName.value())) {
      return true;
    }
  }

  return false;
}

inline bool hasLayoutProps(const folly::dynamic &props) {
  for (const auto &key : props.keys()) {
    const auto propName = propNameFromString(key.asString());
    if (propName.has_value() && isLayoutProp(propName.value())) {
      return true;
    }
  }
  return false;
}

inline bool hasLayoutProps(facebook::jsi::Runtime &rt, const facebook::jsi::Value &value) {
  facebook::jsi::Object obj = value.asObject(rt);
  facebook::jsi::Array names = obj.getPropertyNames(rt);
  const size_t n = names.size(rt);
  for (size_t ki = 0; ki < n; ++ki) {
    facebook::jsi::Value keyVal = names.getValueAtIndex(rt, ki);
    const auto keyStr = keyVal.asString(rt).utf8(rt);
    const auto propName = propNameFromString(keyStr);
    if (propName.has_value() && isLayoutProp(propName.value())) {
      return true;
    }
  }
  return false;
}

} // namespace reanimated

#endif
