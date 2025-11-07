#pragma once

#include <reanimated/LayoutAnimations/LayoutAnimationType.h>
#include <worklets/SharedItems/Serializable.h>
#include <memory>
#include <optional>
#include <string>

namespace reanimated {

struct LayoutAnimationRawConfigValues {
  std::optional<double> duration; // TODO: all of 'em
};

struct LayoutAnimationRawConfig {
  std::optional<std::string> presetName;
  std::optional<LayoutAnimationRawConfigValues> values;
};

struct LayoutAnimationConfig {
  int tag;
  LayoutAnimationType type;
  std::shared_ptr<worklets::Serializable> config;
  std::shared_ptr<LayoutAnimationRawConfig> rawConfig;
};

} // namespace reanimated
