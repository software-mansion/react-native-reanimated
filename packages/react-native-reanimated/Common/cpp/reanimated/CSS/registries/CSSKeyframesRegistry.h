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
      const std::string &compoundComponentKey);
  void set(const std::string &animationName, const std::string &compoundComponentKey, CSSKeyframesConfig &&config);
  void remove(const std::string &animationName, const std::string &compoundComponentKey);

 private:
  // Maps compound component key to CSSKeyframesConfig. The same keyframes object may be
  // interpolated differently per component (different interpolators) even when the
  // keyframes look identical. CSSKeyframesConfig holds a component-specific
  // styleInterpolator, so configs must be stored separately per component.
  // Compound component key combines native and JS component names (caller must build it).
  using KeyframesByCompoundComponentKey = std::unordered_map<std::string, CSSKeyframesConfig>;

  // Top level: keyframes key. Inner level: compound component key -> config.
  std::unordered_map<std::string, KeyframesByCompoundComponentKey> registry_;
  const std::shared_ptr<ViewStylesRepository> viewStylesRepository_;
};

} // namespace reanimated::css
