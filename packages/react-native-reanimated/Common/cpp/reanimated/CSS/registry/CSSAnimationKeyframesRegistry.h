#pragma once
#ifdef RCT_NEW_ARCH_ENABLED

#include <reanimated/CSS/config/CSSAnimationKeyframesConfig.h>

#include <memory>
#include <string>
#include <unordered_map>

namespace reanimated {

class CSSAnimationKeyframesRegistry {
 public:
  const CSSAnimationKeyframesConfig &get(
      const std::string &animationName) const;
  void add(
      const std::string &animationName,
      CSSAnimationKeyframesConfig &&config);
  void remove(const std::string &animationName);

 private:
  std::unordered_map<std::string, CSSAnimationKeyframesConfig> registry_;
};

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
