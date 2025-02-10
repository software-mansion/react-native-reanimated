#pragma once
#ifdef RCT_NEW_ARCH_ENABLED

#include <reanimated/CSS/interpolation/styles/AnimationStyleInterpolator.h>

#include <memory>
#include <string>
#include <unordered_map>

namespace reanimated {

class CSSKeyframesRegistry {
 public:
  bool has(const std::string &animationName) const;
  std::shared_ptr<AnimationStyleInterpolator> get(
      const std::string &animationName) const;
  void set(
      const std::string &animationName,
      const std::shared_ptr<AnimationStyleInterpolator> &interpolator);
  void remove(const std::string &animationName);

 private:
  std::unordered_map<std::string, std::shared_ptr<AnimationStyleInterpolator>>
      interpolators_;
};

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
