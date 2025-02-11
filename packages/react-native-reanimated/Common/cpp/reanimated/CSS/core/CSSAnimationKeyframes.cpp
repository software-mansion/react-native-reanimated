#ifdef RCT_NEW_ARCH_ENABLED
#include <reanimated/CSS/core/CSSAnimationKeyframes.h>

namespace reanimated {

CSSAnimationKeyframes::CSSAnimationKeyframes(const jsi::Value &config)
    : name_(config.getProperty(rt, "name").asString(rt).utf8(rt)),
      interpolator_(
          std::make_shared<AnimationStyleInterpolator>(viewStylesRepository_)),
      keyframeEasingFunctions_(std::make_shared<KeyframeEasingFunctions>()) {}

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
