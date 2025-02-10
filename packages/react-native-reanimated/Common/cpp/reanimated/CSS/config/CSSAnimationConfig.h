#pragma once
#ifdef RCT_NEW_ARCH_ENABLED

#include <reanimated/CSS/config/common.h>
#include <reanimated/CSS/easing/EasingFunctions.h>
#include <reanimated/CSS/interpolation/styles/AnimationStyleInterpolator.h>
#include <reanimated/CSS/registry/CSSKeyframesRegistry.h>

#include <memory>
#include <optional>
#include <string>
#include <unordered_map>

namespace reanimated {

enum class AnimationDirection { Normal, Reverse, Alternate, AlternateReverse };
enum class AnimationFillMode { None, Forwards, Backwards, Both };
enum class AnimationPlayState { Running, Paused };

using KeyframeEasingFunctions = std::unordered_map<double, EasingFunction>;

struct CSSAnimationConfig {
  std::shared_ptr<AnimationStyleInterpolator> styleInterpolator;
  KeyframeEasingFunctions keyframeEasingFunctions;
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

std::shared_ptr<AnimationStyleInterpolator> getStyleInterpolator(
    jsi::Runtime &rt,
    const jsi::Object &config,
    const std::shared_ptr<CSSKeyframesRegistry> &keyframesRegistry);

KeyframeEasingFunctions getKeyframeTimingFunctions(
    jsi::Runtime &rt,
    const jsi::Object &config);

double getIterationCount(jsi::Runtime &rt, const jsi::Object &config);

AnimationDirection getDirection(jsi::Runtime &rt, const jsi::Object &config);

AnimationFillMode getFillMode(jsi::Runtime &rt, const jsi::Object &config);

AnimationPlayState getPlayState(jsi::Runtime &rt, const jsi::Object &config);

CSSAnimationConfig parseCSSAnimationConfig(
    jsi::Runtime &rt,
    const jsi::Value &config,
    const std::shared_ptr<CSSKeyframesRegistry> &keyframesRegistry);

PartialCSSAnimationSettings parsePartialCSSAnimationSettings(
    jsi::Runtime &rt,
    const jsi::Value &partialSettings);

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
