#pragma once

#include <reanimated/CSS/configs/CSSKeyframesConfig.h>
#include <reanimated/CSS/configs/common.h>
#include <reanimated/CSS/easing/EasingFunctions.h>

#include <memory>
#include <optional>
#include <string>
#include <unordered_map>
#include <utility>
#include <vector>

namespace reanimated::css {

enum class AnimationDirection { Normal, Reverse, Alternate, AlternateReverse };
enum class AnimationFillMode { None, Forwards, Backwards, Both };
enum class AnimationPlayState { Running, Paused };

struct CSSAnimationSettings {
  double duration;
  EasingFunction easingFunction;
  double delay;
  double iterationCount;
  AnimationDirection direction;
  AnimationFillMode fillMode;
  AnimationPlayState playState;
};

struct PartialCSSAnimationSettings {
  std::optional<double> duration;
  std::optional<EasingFunction> easingFunction;
  std::optional<double> delay;
  std::optional<double> iterationCount;
  std::optional<AnimationDirection> direction;
  std::optional<AnimationFillMode> fillMode;
  std::optional<AnimationPlayState> playState;
};

using CSSAnimationSettingsMap =
    std::unordered_map<size_t, CSSAnimationSettings>;
using CSSAnimationSettingsUpdatesMap =
    std::unordered_map<size_t, PartialCSSAnimationSettings>;

struct CSSAnimationUpdates {
  std::optional<std::vector<std::string>> animationNames;
  CSSAnimationSettingsMap newAnimationSettings;
  CSSAnimationSettingsUpdatesMap settingsUpdates;
};

CSSAnimationUpdates parseCSSAnimationUpdates(
    jsi::Runtime &rt,
    const jsi::Value &config);

} // namespace reanimated::css
