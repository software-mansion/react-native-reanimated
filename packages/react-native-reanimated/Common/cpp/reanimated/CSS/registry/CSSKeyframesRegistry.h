#pragma once
#ifdef RCT_NEW_ARCH_ENABLED

#include <reanimated/CSS/config/CSSKeyframesConfig.h>

#include <memory>
#include <string>
#include <unordered_map>
#include <utility>

namespace reanimated {

class CSSKeyframesRegistry {
 public:
  const CSSKeyframesConfig &get(const std::string &animationName) const;
  void add(const std::string &animationName, CSSKeyframesConfig &&config);
  void remove(const std::string &animationName);

 private:
  std::unordered_map<std::string, CSSKeyframesConfig> registry_;
};

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
