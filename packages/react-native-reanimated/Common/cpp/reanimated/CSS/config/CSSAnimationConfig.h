#pragma once

#include <reanimated/CSS/easing/EasingFunctions.h>

#include <memory>
#include <optional>
#include <string>
#include <unordered_map>

namespace reanimated {

enum class AnimationDirection { NORMAL, REVERSE, ALTERNATE, ALTERNATE_REVERSE };
enum class AnimationFillMode { NONE, FORWARDS, BACKWARDS, BOTH };
enum class AnimationPlayState { RUNNING, PAUSED };

struct CSSAnimationConfig {
  jsi::Value keyframeStyle;
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

inline jsi::Value getAnimationKeyframeStyle(
    jsi::Runtime &rt,
    const jsi::Object &config);

inline double getAnimationDuration(jsi::Runtime &rt, const jsi::Object &config);

inline EasingFunction getAnimationTimingFunction(
    jsi::Runtime &rt,
    const jsi::Object &config);

inline double getAnimationDelay(jsi::Runtime &rt, const jsi::Object &config);

inline double getAnimationIterationCount(
    jsi::Runtime &rt,
    const jsi::Object &config);

inline AnimationDirection getAnimationDirection(
    jsi::Runtime &rt,
    const jsi::Object &config);

inline AnimationFillMode getAnimationFillMode(
    jsi::Runtime &rt,
    const jsi::Object &config);

inline AnimationPlayState getAnimationPlayState(
    jsi::Runtime &rt,
    const jsi::Object &config);

CSSAnimationConfig parseCSSAnimationConfig(
    jsi::Runtime &rt,
    const jsi::Value &config);

PartialCSSAnimationSettings parsePartialCSSAnimationSettings(
    jsi::Runtime &rt,
    const jsi::Value &partialSettings);

} // namespace reanimated
