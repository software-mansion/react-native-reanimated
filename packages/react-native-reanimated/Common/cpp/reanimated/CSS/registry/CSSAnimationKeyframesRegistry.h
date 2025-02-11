#pragma once
#ifdef RCT_NEW_ARCH_ENABLED

#include <reanimated/CSS/interpolation/styles/AnimationStyleInterpolator.h>

#include <memory>
#include <string>
#include <unordered_map>

namespace reanimated {

class CSSKeyframesRegistry {
 public:
  std::shared_ptr<CSSAnimationKeyframesConfig> get(
      const std::string &animationName) const;
  void add(const CSSAnimationKeyframesConfig &config);
  void remove(const std::string &animationName);

 private:
  std::unordered_map<std::string, std::shared_ptr<CSSAnimationKeyframesConfig>>
      registry_;
};

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
