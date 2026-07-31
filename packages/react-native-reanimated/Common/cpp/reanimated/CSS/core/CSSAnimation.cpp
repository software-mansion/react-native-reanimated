#include <reanimated/CSS/core/CSSAnimation.h>
#include <reanimated/CSS/core/CSSLoopAnimation.h>
#include <reanimated/Tools/FeatureFlags.h>

#include <algorithm>
#include <memory>
#include <utility>

namespace reanimated::css {

CSSAnimation::CSSAnimation(
    const Tag viewTag,
    std::string animationName,
    const CSSKeyframesConfig &cssKeyframesConfig,
    const CSSAnimationSettings &settings,
    Observer &observer,
    const std::shared_ptr<CSSPlatformAnimationFactory> &platformAnimationFactory,
    const double timestamp)
    : viewTag_(viewTag),
      name_(std::move(animationName)),
      observer_(observer),
      keyframesConfig_(cssKeyframesConfig),
      settings_(std::make_shared<CSSAnimationSettings>(settings)),
      styleInterpolator_(cssKeyframesConfig.styleInterpolatorFactory->create()),
      progressProvider_(std::make_shared<AnimationProgressProvider>(
          timestamp,
          settings.duration,
          settings.delay,
          settings.iterationCount,
          settings.direction,
          getEasingFunctionFromConfig(settings.easingConfig),
          cssKeyframesConfig.keyframeEasingConfigs)),
      loopAnimation_(
          std::make_shared<CSSLoopAnimation>(viewTag, styleInterpolator_, settings_, progressProvider_, observer)),
      platformAnimationFactory_(platformAnimationFactory) {
  if (settings.playState == AnimationPlayState::Paused) {
    progressProvider_->pause(timestamp);
  }
  updatePropertyRouting();
}

CSSAnimation::~CSSAnimation() {
  // The loop co-owns the provider and unschedule() only enqueues the removal,
  // so a frame already in flight can still tick it after we are gone. Drop the
  // reporter so that tick has nothing to call back into.
  progressProvider_->onMilestone(nullptr);
}

AnimationProgressState CSSAnimation::getState() const {
  return progressProvider_->getState();
}

void CSSAnimation::setEventMask(const CSSEventMask eventMask) {
  if (eventMask == eventMask_) {
    return;
  }
  eventMask_ = eventMask;

  if (eventMask == 0) {
    progressProvider_->onMilestone(nullptr);
    return;
  }
  progressProvider_->onMilestone([this](const RunMilestone milestone) { reportMilestone(milestone); });
}

void CSSAnimation::reportCancellation(const double timestamp) {
  cancelTimestamp_ = timestamp;
  progressProvider_->abort();
}

void CSSAnimation::reportMilestone(const RunMilestone milestone) {
  switch (milestone) {
    case RunMilestone::Started:
      emitEvent(CSSEventType::AnimationStart, startElapsedTime());
      break;
    case RunMilestone::Repeated:
      emitEvent(CSSEventType::AnimationIteration, iterationElapsedTime());
      break;
    case RunMilestone::Ended:
      emitEvent(CSSEventType::AnimationEnd, endElapsedTime());
      break;
    case RunMilestone::Aborted:
      emitEvent(CSSEventType::AnimationCancel, cancelElapsedTime());
      break;
    case RunMilestone::Created:
      // Animations have no creation event, unlike transitions.
      break;
  }
}

void CSSAnimation::emitEvent(const CSSEventType type, const double elapsedTime) const {
  if (!hasListener(eventMask_, type)) {
    return;
  }
  observer_.onAnimationEvent(viewTag_, name_, type, elapsedTime);
}

double CSSAnimation::startElapsedTime() const {
  // A negative delay starts the animation partway through.
  const auto elapsedTime = std::max(0.0, -progressProvider_->getDelay());
  const auto iterationCount = progressProvider_->getIterationCount();

  // An infinite animation has no total duration to be capped against.
  if (iterationCount < 0) {
    return elapsedTime;
  }
  return std::min(elapsedTime, progressProvider_->getDuration() * iterationCount);
}

double CSSAnimation::iterationElapsedTime() const {
  return (progressProvider_->getCurrentIteration() - 1) * progressProvider_->getDuration();
}

double CSSAnimation::endElapsedTime() const {
  return progressProvider_->getDuration() * progressProvider_->getIterationCount();
}

double CSSAnimation::cancelElapsedTime() const {
  return std::max(0.0, cancelTimestamp_ - progressProvider_->getStartTimestamp(cancelTimestamp_));
}

folly::dynamic CSSAnimation::getBackwardsFillStyle() const {
  return isReversed() ? styleInterpolator_->getLastKeyframeValue() : styleInterpolator_->getFirstKeyframeValue();
}

folly::dynamic CSSAnimation::getCurrentInterpolationStyle(const std::shared_ptr<const ShadowNode> &shadowNode) const {
  return loopAnimation_->getCurrentInterpolationStyle(shadowNode);
}

folly::dynamic CSSAnimation::getResetStyle(const std::shared_ptr<const ShadowNode> &shadowNode) const {
  return keyframesConfig_.styleInterpolatorFactory->getResetStyle(shadowNode);
}

void CSSAnimation::schedule(OperationsLoop &loop) {
  loopAnimation_->schedule(loop);
  if (platformAnimation_) {
    platformAnimation_->schedule(loop.resolveTimestamp() + settings_->delay);
  }
}

void CSSAnimation::unschedule(OperationsLoop &loop) {
  loopAnimation_->unschedule(loop);
  if (platformAnimation_) {
    platformAnimation_->unschedule();
  }
}

void CSSAnimation::updateSettings(const PartialCSSAnimationSettings &updatedSettings, const double timestamp) {
  loopAnimation_->updateSettings(updatedSettings, timestamp);
}

bool CSSAnimation::isReversed() const {
  return settings_->direction == AnimationDirection::Reverse ||
      settings_->direction == AnimationDirection::AlternateReverse;
}

void CSSAnimation::updatePropertyRouting() {
  if (!platformAnimationFactory_) {
    return;
  }
  if constexpr (!StaticFeatureFlags::getFlag("IOS_CSS_CORE_ANIMATION")) {
    return;
  }
  const auto &allProperties = keyframesConfig_.styleInterpolatorFactory->getAllPropertyNames();
  auto result = platformAnimationFactory_->resolve(viewTag_, name_, allProperties, keyframesConfig_, settings_);
  platformAnimation_ = result.animation;
  loopAnimation_->setAnimatedProperties(result.remainingProperties);
}

} // namespace reanimated::css
