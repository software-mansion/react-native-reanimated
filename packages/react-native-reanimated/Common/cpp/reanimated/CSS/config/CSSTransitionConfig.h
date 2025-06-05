#pragma once

#include <react/renderer/core/RawValue.h>

#include <reanimated/CSS/common/definitions.h>
#include <reanimated/CSS/config/common.h>
#include <reanimated/CSS/easing/utils.h>

#include <folly/dynamic.h>
#include <memory>
#include <string>
#include <unordered_map>

namespace reanimated::css {

using namespace facebook::react;

struct CSSTransitionPropertySettings {
  double duration;
  std::shared_ptr<Easing> easing;
  double delay;
  bool allowDiscrete;

  bool operator==(const CSSTransitionPropertySettings &other) const;
};

using CSSTransitionPropertiesSettings =
    std::unordered_map<std::string, CSSTransitionPropertySettings>;

struct CSSTransitionConfig {
  TransitionProperties properties;
  CSSTransitionPropertiesSettings settings;

  // TODO - remove this constructor when refactor is finished
  CSSTransitionConfig(
      TransitionProperties properties,
      CSSTransitionPropertiesSettings settings);

  // Both constructors are needed for rawValue conversion
  // (node_modules/react-native/ReactCommon/react/renderer/core/propsConversions.h)
  CSSTransitionConfig() = default;
  explicit CSSTransitionConfig(const RawValue &rawValue);

  bool operator==(const CSSTransitionConfig &other) const;
};

std::optional<CSSTransitionPropertySettings> getTransitionPropertySettings(
    const CSSTransitionPropertiesSettings &propertiesSettings,
    const std::string &propName);

// TODO - remove this implementation when CSS refactor is finished
struct CSSTransitionConfigUpdates {
  std::optional<TransitionProperties> properties;
  std::optional<CSSTransitionPropertiesSettings> settings;
};

CSSTransitionConfig parseCSSTransitionConfig(
    jsi::Runtime &rt,
    const jsi::Value &config);

CSSTransitionConfigUpdates getParsedCSSTransitionConfigUpdates(
    jsi::Runtime &rt,
    const jsi::Value &partialConfig);

} // namespace reanimated::css
