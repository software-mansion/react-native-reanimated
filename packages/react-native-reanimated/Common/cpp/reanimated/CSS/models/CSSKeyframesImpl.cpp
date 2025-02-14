#ifdef RCT_NEW_ARCH_ENABLED

#include <reanimated/CSS/models/CSSKeyframesImpl.h>

namespace reanimated {

CSSKeyframesImpl::CSSKeyframesImpl(
    const CSSKeyframesConfig &config,
    CleanupCallback &&cleanupCallback)
    : animationName_(config.animationName),
      styleInterpolator_(config.styleInterpolator),
      keyframeEasingFunctions_(config.keyframeEasingFunctions),
      cleanupCallback_(std::move(cleanupCallback)) {}

CSSKeyframesImpl::~CSSKeyframesImpl() {
  cleanupCallback_(animationName_);
}

const std::string &CSSKeyframesImpl::getAnimationName() const {
  return animationName_;
}

const std::shared_ptr<KeyframeEasingFunctions> &
CSSKeyframesImpl::getKeyframeEasingFunctions() const {
  return keyframeEasingFunctions_;
}

const std::shared_ptr<AnimationStyleInterpolator> &
CSSKeyframesImpl::getStyleInterpolator() const {
  return styleInterpolator_;
}

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
