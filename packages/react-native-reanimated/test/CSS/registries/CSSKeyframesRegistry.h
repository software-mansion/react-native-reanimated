#pragma once

#include <reanimated/CSS/configs/CSSKeyframesConfig.h>
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

  const CSSKeyframesConfig &get(
      const std::string &animationName,
      const std::string &componentName);
  void set(
      const std::string &animationName,
      const std::string &componentName,
      CSSKeyframesConfig &&config);
  void remove(
      const std::string &animationName,
      const std::string &componentName);

 private:
  using ConfigsByComponentName =
      std::unordered_map<std::string, CSSKeyframesConfig>;

  std::unordered_map<std::string, ConfigsByComponentName> registry_;
  const std::shared_ptr<ViewStylesRepository> viewStylesRepository_;
};

} // namespace reanimated::css
