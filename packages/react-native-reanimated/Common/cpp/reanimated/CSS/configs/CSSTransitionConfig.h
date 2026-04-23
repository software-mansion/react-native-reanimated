#pragma once

#include <reanimated/CSS/easing/EasingFunctions.h>

#include <folly/dynamic.h>
#include <jsi/jsi.h>
#include <concepts>
#include <string>
#include <unordered_map>
#include <utility>
#include <vector>

namespace reanimated::css {

template <typename T>
concept CSSValueType = std::same_as<T, jsi::Value> || std::same_as<T, folly::dynamic>;

template <CSSValueType ValueType>
struct CSSTransitionPropertySettings {
  std::pair<ValueType, ValueType> value;
  double duration;
  EasingFunction easingFunction;
  double delay;
  bool allowDiscrete;
};

template <CSSValueType ValueType>
using CSSTransitionPropertiesSettings = std::unordered_map<std::string, CSSTransitionPropertySettings<ValueType>>;

template <CSSValueType ValueType>
struct CSSTransitionConfig {
  CSSTransitionPropertiesSettings<ValueType> changedProperties;
  std::vector<std::string> removedProperties;
};

CSSTransitionConfig<jsi::Value> parseCSSTransitionConfig(jsi::Runtime &rt, const jsi::Value &config);
CSSTransitionConfig<folly::dynamic> parseCSSTransitionConfig(const folly::dynamic &config);

} // namespace reanimated::css
