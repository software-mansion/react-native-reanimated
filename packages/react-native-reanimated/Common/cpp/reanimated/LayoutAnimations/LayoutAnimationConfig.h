#pragma once

#include <reanimated/Compat/WorkletsApi.h>
#include <reanimated/LayoutAnimations/LayoutAnimationType.h>
#include <memory>
#include <optional>
#include <string>

namespace reanimated {

struct LayoutAnimationRawConfigValues {
  std::optional<double> delay; // TODO: Implement? What about randomDelay?
  std::optional<double> duration; // TODO: all of 'em

  // Spring - TODO: Implement
  std::optional<bool> springified;
  std::optional<double> damping;
  std::optional<double> dampingRatio;
  std::optional<double> energyThreshold;
  std::optional<double> mass;
  std::optional<bool> overshootClamping;
  std::optional<double> stiffness;

  // TODO: What about easing?
};

struct LayoutAnimationRawConfig {
  std::optional<std::string> presetName;
  std::optional<LayoutAnimationRawConfigValues> values;
};

struct LayoutAnimationConfig {
  int tag;
  LayoutAnimationType type;
  std::shared_ptr<worklets::Serializable> config;
  std::string sharedTransitionTag;
  std::shared_ptr<LayoutAnimationRawConfig> rawConfig;
};

} // namespace reanimated
