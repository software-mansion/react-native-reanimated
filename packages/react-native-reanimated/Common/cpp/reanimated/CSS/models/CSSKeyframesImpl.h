#pragma once
#ifdef RCT_NEW_ARCH_ENABLED

#include <reanimated/CSS/config/CSSKeyframesConfig.h>
#include <reanimated/CSS/registry/CSSKeyframesRegistry.h>

#include <functional>
#include <memory>
#include <string>
#include <utility>

namespace reanimated {

class CSSKeyframesImpl : public jsi::HostObject, public CSSKeyframes {
 public:
  using CleanupCallback = std::function<void(const std::string &)>;

  CSSKeyframesImpl(
      const CSSKeyframesConfig &config,
      CleanupCallback &&cleanupCallback);

  ~CSSKeyframesImpl();

  const std::string &getAnimationName() const override;
  const std::shared_ptr<KeyframeEasingFunctions> &getKeyframeEasingFunctions()
      const override;
  const std::shared_ptr<AnimationStyleInterpolator> &getStyleInterpolator()
      const override;

 private:
  const std::string animationName_;
  const std::shared_ptr<KeyframeEasingFunctions> keyframeEasingFunctions_;
  std::shared_ptr<AnimationStyleInterpolator> styleInterpolator_;
  CleanupCallback cleanupCallback_;
};

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
