#include <reanimated/CSS/core/CSSAnimation.h>
#include <reanimated/CSS/progress/KeyframeProgressProvider.h>

#include <memory>
#include <string>
#include <utility>

namespace reanimated::css {

namespace {

class StaticProgressProvider : public KeyframeProgressProvider {
 public:
  explicit StaticProgressProvider(double progress) : progress_(progress) {}

  double getGlobalProgress() const override {
    return progress_;
  }

  double getKeyframeProgress(double fromOffset, double toOffset) const override {
    if (fromOffset == toOffset) {
      return 1;
    }
    return (progress_ - fromOffset) / (toOffset - fromOffset);
  }

 private:
  double progress_;
};

} // namespace

CSSAnimation::CSSAnimation(
    std::shared_ptr<const ShadowNode> shadowNode,
    std::string animationName,
    const CSSKeyframesConfig &cssKeyframesConfig,
    const CSSAnimationSettings &settings,
    const std::shared_ptr<std::unordered_set<Tag>> &updatedViewTags,
    const std::shared_ptr<std::unordered_set<Tag>> &revertedTags,
    const std::shared_ptr<OperationsLoop> &loop,
    const std::shared_ptr<CSSPlatformAnimationFactory> &platformAnimationFactory,
    const double timestamp)
    : name_(std::move(animationName)),
      shadowNode_(std::move(shadowNode)),
      keyframesConfig_(cssKeyframesConfig),
      settings_(std::make_shared<CSSAnimationSettings>(settings)),
      updatedViewTags_(updatedViewTags),
      revertedTags_(revertedTags),
      loop_(loop),
      platformAnimationFactory_(platformAnimationFactory) {
  updatePropertyRouting(timestamp);
}

const std::string &CSSAnimation::getName() const {
  return name_;
}

bool CSSAnimation::hasForwardsFillMode() const {
  return settings_->hasForwardsFillMode();
}

bool CSSAnimation::hasBackwardsFillMode() const {
  return settings_->hasBackwardsFillMode();
}

bool CSSAnimation::hasLoopAnimation() const {
  return loopAnimation_ != nullptr;
}

std::shared_ptr<CSSLoopAnimation> CSSAnimation::getLoopAnimation() const {
  return loopAnimation_;
}

folly::dynamic CSSAnimation::getBackwardsFillStyle() const {
  auto progressProvider = std::make_shared<StaticProgressProvider>(isReversed() ? 1.0 : 0.0);
  auto interpolator = keyframesConfig_.styleInterpolatorFactory->create();
  return interpolator->interpolate(shadowNode_, progressProvider, 0.5);
}

folly::dynamic CSSAnimation::getForwardsFillStyle() const {
  const auto iterationCount = settings_->iterationCount;
  const bool isInteger = iterationCount == std::floor(iterationCount);
  const auto finalIterationProgress = isInteger ? 1.0 : iterationCount - std::floor(iterationCount);
  const auto finalIteration = static_cast<unsigned>(std::ceil(iterationCount));
  const auto fillProgress =
      AnimationProgressProvider::applyDirection(finalIterationProgress, settings_->direction, finalIteration);

  auto progressProvider = std::make_shared<StaticProgressProvider>(fillProgress);
  auto interpolator = keyframesConfig_.styleInterpolatorFactory->create();
  return interpolator->interpolate(shadowNode_, progressProvider, 0.5);
}

folly::dynamic CSSAnimation::getResetStyle() const {
  return keyframesConfig_.styleInterpolatorFactory->getResetStyle(shadowNode_);
}

void CSSAnimation::schedule() {
  const auto startTimestamp = loop_->getTimestamp() + settings_->delay;

  if (loopAnimation_) {
    loopAnimation_->schedule(startTimestamp);
  }
  if (platformAnimation_) {
    platformAnimation_->schedule(startTimestamp);
  }
}

void CSSAnimation::unschedule() {
  if (loopAnimation_) {
    loopAnimation_->unschedule();
  }
  if (platformAnimation_) {
    platformAnimation_->unschedule();
  }
}

void CSSAnimation::updateSettings(const PartialCSSAnimationSettings &updatedSettings, const double timestamp) {
  if (updatedSettings.duration.has_value()) {
    settings_->duration = updatedSettings.duration.value();
  }
  if (updatedSettings.easingConfig.has_value()) {
    settings_->easingConfig = updatedSettings.easingConfig.value();
    updatePropertyRouting(timestamp);
  }
  if (updatedSettings.delay.has_value()) {
    settings_->delay = updatedSettings.delay.value();
  }
  if (updatedSettings.iterationCount.has_value()) {
    settings_->iterationCount = updatedSettings.iterationCount.value();
  }
  if (updatedSettings.direction.has_value()) {
    settings_->direction = updatedSettings.direction.value();
  }
  if (updatedSettings.fillMode.has_value()) {
    settings_->fillMode = updatedSettings.fillMode.value();
  }
  if (updatedSettings.playState.has_value()) {
    settings_->playState = updatedSettings.playState.value();
  }

  if (loopAnimation_) {
    loopAnimation_->updateSettings(updatedSettings, timestamp);
  }
}

bool CSSAnimation::isReversed() const {
  return settings_->direction == AnimationDirection::Reverse ||
      settings_->direction == AnimationDirection::AlternateReverse;
}

void CSSAnimation::updatePropertyRouting(const double timestamp) {
  const auto &allProperties = keyframesConfig_.styleInterpolatorFactory->getAllPropertyNames();

  std::unordered_set<std::string> loopProperties;

  if (platformAnimationFactory_) {
    auto result =
        platformAnimationFactory_->resolve(shadowNode_->getTag(), name_, allProperties, keyframesConfig_, settings_);
    platformAnimation_ = std::move(result.animation);
    loopProperties = std::move(result.remainingProperties);
  } else {
    platformAnimation_.reset();
    loopProperties = allProperties;
  }

  if (loopProperties.empty()) {
    unschedule();
    loopAnimation_.reset();
    return;
  }

  if (!loopAnimation_) {
    loopAnimation_ = std::make_shared<CSSLoopAnimation>(
        keyframesConfig_.styleInterpolatorFactory->create(loopProperties),
        allProperties,
        shadowNode_,
        settings_,
        keyframesConfig_.keyframeEasingConfigs,
        updatedViewTags_,
        revertedTags_,
        loop_,
        timestamp);
    return;
  }

  loopAnimation_->setAnimatedProperties(loopProperties);
}

} // namespace reanimated::css
