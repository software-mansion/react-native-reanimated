#pragma once

#include <reanimated/CSS/configs/CSSKeyframesConfig.h>
#include <reanimated/CSS/interpolation/styles/AnimationStyleInterpolator.h>
#include <reanimated/CSS/misc/ViewStylesRepository.h>

#include <functional>
#include <memory>
#include <optional>
#include <string>
#include <unordered_map>
#include <utility>

namespace reanimated::css {

class CSSKeyframesRegistry {
 public:
  explicit CSSKeyframesRegistry(const std::shared_ptr<ViewStylesRepository> &viewStylesRepository);

  std::optional<std::reference_wrapper<const CSSKeyframesConfig>> get(
      const std::string &animationName,
      const std::string &compoundComponentName);
  void set(const std::string &animationName, const std::string &compoundComponentName, CSSKeyframesConfig &&config);
  void remove(const std::string &animationName, const std::string &compoundComponentName);

 private:
  // Maps compound component name to CSSKeyframesConfig. The same keyframes object may be
  // interpolated differently per component (different interpolators) even when the
  // keyframes look identical. CSSKeyframesConfig holds a component-specific
  // styleInterpolator, so configs must be stored separately per component.
  // Compound component name combines native and JS component names (caller must build it).
  using KeyframesByCompoundComponentName = std::unordered_map<std::string, CSSKeyframesConfig>;

  // Top level: animation name. Inner level: compound component name -> config.
  std::unordered_map<std::string, KeyframesByCompoundComponentName> registry_;
  const std::shared_ptr<ViewStylesRepository> viewStylesRepository_;
};

} // namespace reanimated::css
