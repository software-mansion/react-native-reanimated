#pragma once

#include <reanimated/CSS/configs/common.h>

#include <folly/dynamic.h>
#include <jsi/jsi.h>
#include <string>
#include <unordered_map>
#include <utility>
#include <vector>

namespace reanimated::css {

struct CSSTransitionPropertySettings {
  double duration;
  EasingConfig easingConfig;
  double delay;
  bool allowDiscrete;
};

/// One run of a transition: when it starts, how long it takes, its easing, and
/// the reversing shortening factor accumulated so far (1 until a reversal).
/// The easing stays a config so a run that never reverses never resolves it.
struct TransitionTiming {
  double reversingFactor;
  double startTimestamp;
  double duration;
  double delay;
  EasingConfig easing;
};

TransitionTiming makeTiming(double timestamp, double duration, double delay, EasingConfig easing);

/// The easing output at `timestamp`. 0 while the run is still delayed: steps and
/// linear() stops can map progress 0 above 0, but nothing has played yet.
double easedProgressAt(const TransitionTiming &timing, double timestamp);

/// The run that reverses `previous` mid-flight, shortened by how far `previous`
/// got: https://drafts.csswg.org/css-transitions/#reversing
TransitionTiming
reverseTiming(const TransitionTiming &previous, double timestamp, double duration, double delay, EasingConfig easing);

using PropertyValueDiff = std::pair<jsi::Value, jsi::Value>;
/** TODO: unify folly::dynamic and jsi::value versions */
using PropertyValueDynamicDiff = std::pair<folly::dynamic, folly::dynamic>;

using PropertyValueDiffsMap = std::unordered_map<std::string, PropertyValueDiff>;
/** TODO: unify folly::dynamic and jsi::value versions */
using PropertyValueDynamicDiffsMap = std::unordered_map<std::string, PropertyValueDynamicDiff>;

using PropertiesSettingsMap = std::unordered_map<std::string, CSSTransitionPropertySettings>;

struct CSSTransitionConfig {
  PropertiesSettingsMap changedPropertiesSettings;
  PropertyValueDiffsMap changedProperties;
  std::vector<std::string> removedProperties;

  bool hasValueUpdates() const {
    return !changedProperties.empty();
  }
};

CSSTransitionConfig
parseCSSTransitionConfig(jsi::Runtime &rt, const std::string &componentName, const jsi::Value &config);

} // namespace reanimated::css
