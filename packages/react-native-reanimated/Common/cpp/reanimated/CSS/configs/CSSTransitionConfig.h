#pragma once

#include <reanimated/CSS/common/definitions.h>
#include <reanimated/CSS/configs/common.h>
#include <reanimated/CSS/easing/EasingFunctions.h>

#include <string>
#include <unordered_map>

namespace reanimated::css {

struct CSSTransitionChangedProps {
  const folly::dynamic oldProps;
  const folly::dynamic newProps;
  const PropertyNames changedPropertyNames;
  const PropertyNames removedPropertyNames;
};

struct CSSTransitionPropertySettings {
  double duration;
  EasingFunction easingFunction;
  double delay;
};

using CSSTransitionSettingsMap = std::unordered_map<std::string, CSSTransitionPropertySettings>;

using CSSTransitionConfigMap {
  CSSTransitionChangedProps changedProps;
  CSSTransitionSettingsMap propertySettings;
};

CSSTransitionConfig parseCSSTransitionConfig(jsi::Runtime &rt, const jsi::Value &config);

CSSTransitionPropertySettings getTransitionPropertySettings(
    const CSSTransitionPropertiesSettings &propertiesSettings,
    const std::string &propName);

} // namespace reanimated::css
