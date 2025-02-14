#pragma once
#ifdef RCT_NEW_ARCH_ENABLED

#include <reanimated/CSS/common/definitions.h>
#include <reanimated/CSS/interpolation/styles/AnimationStyleInterpolator.h>

#include <memory>
#include <string>
#include <unordered_map>
#include <utility>

namespace reanimated {

// This is just an interface to ensure that the CSSKeyframesImpl is
// correctly implemented and to prevent include cycles
// (CSSKeyframesImpl includes CSSKeyframesRegistry but CSSKeyframesRegistry
// has to store CSSKeyframesImpl, hence we create a helper, abstract
// CSSKeyframes class).
class CSSKeyframes {
 public:
  virtual const std::string &getAnimationName() const = 0;
  virtual const std::shared_ptr<KeyframeEasingFunctions> &
  getKeyframeEasingFunctions() const = 0;
  virtual const std::shared_ptr<AnimationStyleInterpolator> &
  getStyleInterpolator() const = 0;
};

class CSSKeyframesRegistry {
 public:
  const std::shared_ptr<CSSKeyframes> &get(
      const std::string &animationName) const;
  void add(const std::shared_ptr<CSSKeyframes> &rule);
  void remove(const std::string &animationName);

 private:
  std::unordered_map<std::string, std::shared_ptr<CSSKeyframes>> registry_;
};

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
