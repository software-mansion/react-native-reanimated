#include <reanimated/CSS/core/CSSAnimation.h>
#include <reanimated/CSS/core/CSSLoopAnimation.h>
#include <reanimated/Tools/FeatureFlags.h>

#include <memory>
#include <utility>

namespace reanimated::css {

CSSAnimation::CSSAnimation(
    const Tag viewTag,
    std::string animationName,
    const CSSKeyframesConfig &cssKeyframesConfig,
    const CSSAnimationSettings &settings,
    CSSAnimationObserver &observer,
    const std::shared_ptr<CSSPlatformAnimationFactory> &platformAnimationFactory,
    const double timestamp)
    : viewTag_(viewTag),
      name_(std::move(animationName)),
      observer_(observer),
      keyframesConfig_(cssKeyframesConfig),
      settings_(std::make_shared<CSSAnimationSettings>(settings)),
      styleInterpolator_(cssKeyframesConfig.styleInterpolatorFactory->create()),
      loopAnimation_(std::make_shared<CSSLoopAnimation>(
          viewTag,
          styleInterpolator_,
          settings_,
          cssKeyframesConfig.keyframeEasingConfigs,
          observer,
          timestamp)),
      platformAnimationFactory_(platformAnimationFactory) {
  updatePropertyRouting();
}

CSSAnimation::~CSSAnimation() {
  // The loop co-owns the animation and unschedule() only enqueues the removal,
  // so a frame already in flight can still tick it after we are gone. Drop the
  // reporter so that tick has nothing to call back into.
  loopAnimation_->setMilestoneReporter(nullptr);
}

AnimationProgressState CSSAnimation::getState() const {
  return loopAnimation_->getState();
}

void CSSAnimation::setEventMask(const CSSEventMask eventMask) {
  if (eventMask == eventMask_) {
    return;
  }
  eventMask_ = eventMask;

  if (eventMask == 0) {
    loopAnimation_->setMilestoneReporter(nullptr);
    return;
  }
  loopAnimation_->setMilestoneReporter(
      [this](const RunMilestone milestone, const double elapsedTimeMs) { reportMilestone(milestone, elapsedTimeMs); });
}

void CSSAnimation::reportCancellation(const double timestamp) {
  loopAnimation_->abort(timestamp);
}

void CSSAnimation::reportMilestone(const RunMilestone milestone, const double elapsedTimeMs) {
  switch (milestone) {
    case RunMilestone::Started:
      emitEvent(CSSEventType::AnimationStart, elapsedTimeMs);
      break;
    case RunMilestone::Repeated:
      emitEvent(CSSEventType::AnimationIteration, elapsedTimeMs);
      break;
    case RunMilestone::Ended:
      emitEvent(CSSEventType::AnimationEnd, elapsedTimeMs);
      break;
    case RunMilestone::Aborted:
      emitEvent(CSSEventType::AnimationCancel, elapsedTimeMs);
      break;
    case RunMilestone::Created:
      // Animations have no creation event, unlike transitions.
      break;
  }
}

void CSSAnimation::emitEvent(const CSSEventType type, const double elapsedTimeMs) const {
  if (!hasListener(eventMask_, type)) {
    return;
  }
  observer_.onAnimationEvent(viewTag_, name_, type, elapsedTimeMs);
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
