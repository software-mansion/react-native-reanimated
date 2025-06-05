#pragma once

#include <reanimated/CSS/config/CSSKeyframesConfig.h>
#include <reanimated/CSS/config/common.h>
#include <reanimated/CSS/easing/utils.h>
#include <reanimated/CSS/registry/CSSKeyframesRegistry.h>

#include <folly/dynamic.h>
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
  std::shared_ptr<Easing> easing;
  double delay;
  double iterationCount;
  AnimationDirection direction;
  AnimationFillMode fillMode;
  AnimationPlayState playState;

  // Both constructors are needed for rawValue conversion
  // (node_modules/react-native/ReactCommon/react/renderer/core/propsConversions.h)
  CSSAnimationSettings() = default;
  CSSAnimationSettings(const RawValue &rawValue);
};

struct CSSAnimationConfig : public CSSAnimationSettings {
  std::string name;
  std::shared_ptr<AnimationStyleInterpolator> styleInterpolator;
  std::shared_ptr<KeyframeEasings> keyframeEasings;

  // TODO - remove this constructor when refactor is finished
  CSSAnimationConfig(
      const std::string &name,
      const std::shared_ptr<CSSKeyframesRegistry> &keyframesRegistry,
      CSSAnimationSettings settings);

  // Both constructors are needed for rawValue conversion
  // (node_modules/react-native/ReactCommon/react/renderer/core/propsConversions.h)
  CSSAnimationConfig() = default;
  explicit CSSAnimationConfig(
      const std::shared_ptr<CSSKeyframesRegistry> &keyframesRegistry,
      const RawValue &rawValue);

  bool operator==(const CSSAnimationConfig &other) const;
};

// TODO - clean up this file once the new CSS implementation is ready

struct PartialCSSAnimationSettings {
  std::optional<double> duration;
  std::optional<std::shared_ptr<Easing>> easing;
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
