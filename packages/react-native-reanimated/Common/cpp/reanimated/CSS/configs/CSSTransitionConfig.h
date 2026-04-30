#pragma once

#include <reanimated/CSS/configs/common.h>

#include <jsi/jsi.h>
#include <string>
#include <unordered_map>
#include <utility>
#include <vector>

namespace reanimated::css {

struct CSSTransitionPropertySettings {
  std::pair<jsi::Value, jsi::Value> value;
  double duration;
  EasingConfig easingConfig;
  double delay;
  bool allowDiscrete;
};

using CSSTransitionPropertiesSettings = std::unordered_map<std::string, CSSTransitionPropertySettings>;

template <typename ChangedT>
struct CSSTransitionConfigBase {
  ChangedT changedProperties;
  std::vector<std::string> removedProperties;
};

using CSSTransitionConfig = CSSTransitionConfigBase<CSSTransitionPropertiesSettings>;

CSSTransitionConfig
parseCSSTransitionConfig(jsi::Runtime &rt, const std::string &componentName, const jsi::Value &config);

} // namespace reanimated::css
