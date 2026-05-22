#pragma once

#include <reanimated/CSS/configs/common.h>

#include <folly/dynamic.h>
#include <jsi/jsi.h>
#include <string>
#include <unordered_map>
#include <utility>
#include <vector>

namespace reanimated::css {

struct CSSTransitionPropertyTimingSettings {
  double duration;
  EasingConfig easingConfig;
  double delay;
  bool allowDiscrete;
};

struct CSSTransitionPropertySettings {
  std::pair<jsi::Value, jsi::Value> value;
  double duration;
  EasingConfig easingConfig;
  double delay;
  bool allowDiscrete;

  CSSTransitionPropertyTimingSettings timing() const {
    return {duration, easingConfig, delay, allowDiscrete};
  }
};

using CSSTransitionPropertiesSettings = std::unordered_map<std::string, CSSTransitionPropertySettings>;
using PropertiesTimingSettingsMap = std::unordered_map<std::string, CSSTransitionPropertyTimingSettings>;

using PropertyValueDiff = std::pair<jsi::Value, jsi::Value>;
/** TODO: unify folly::dynamic and jsi::value versions */
using PropertyValueDynamicDiff = std::pair<folly::dynamic, folly::dynamic>;

using PropertyValueDiffsMap = std::unordered_map<std::string, PropertyValueDiff>;
/** TODO: unify folly::dynamic and jsi::value versions */
using PropertyValueDynamicDiffsMap = std::unordered_map<std::string, PropertyValueDynamicDiff>;

template <typename ChangedT>
struct CSSTransitionConfigBase {
  ChangedT changedProperties;
  std::vector<std::string> removedProperties;
};

using CSSTransitionConfig = CSSTransitionConfigBase<CSSTransitionPropertiesSettings>;

CSSTransitionConfig
parseCSSTransitionConfig(jsi::Runtime &rt, const std::string &componentName, const jsi::Value &config);

} // namespace reanimated::css
