#pragma once

#include <reanimated/CSS/config/CSSKeyframesConfig.h>
#include <reanimated/CSS/interpolation/styles/AnimationStyleInterpolator.h>
#include <reanimated/CSS/misc/ViewStylesRepository.h>

#include <memory>
#include <string>
#include <unordered_map>
#include <utility>

namespace reanimated::css {

class CSSKeyframesRegistry {
 public:
  CSSKeyframesRegistry(
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository);

  const std::shared_ptr<AnimationStyleInterpolator> getOrCreateInterpolator(
      const std::string &animationName,
      const std::string &componentName);
  const std::shared_ptr<KeyframeEasingFunctions> getKeyframeEasingFunctions(
      const std::string &animationName);

  void set(const std::string &animationName, CSSKeyframesConfig &&config);
  void remove(const std::string &animationName);

 private:
  using StyleInterpolatorsByComponentName = std::
      unordered_map<std::string, std::shared_ptr<AnimationStyleInterpolator>>;

  std::unordered_map<std::string, folly::dynamic> keyframeDefinitions_;
  std::unordered_map<std::string, std::shared_ptr<KeyframeEasingFunctions>>
      keyframeEasingFunctions_;
  std::unordered_map<std::string, StyleInterpolatorsByComponentName>
      styleInterpolators_;

  const std::shared_ptr<ViewStylesRepository> viewStylesRepository_;
};

} // namespace reanimated::css
