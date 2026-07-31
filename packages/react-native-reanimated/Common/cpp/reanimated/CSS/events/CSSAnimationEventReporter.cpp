#include <reanimated/CSS/events/CSSAnimationEventReporter.h>

#include <algorithm>
#include <utility>

namespace reanimated::css {

CSSAnimationEventReporter::CSSAnimationEventReporter(
    const Tag viewTag,
    std::string animationName,
    CSSAnimationObserver &observer,
    const std::shared_ptr<AnimationProgressProvider> &progressProvider)
    : viewTag_(viewTag),
      animationName_(std::move(animationName)),
      observer_(observer),
      progressProvider_(progressProvider) {
  progressProvider_->onMilestone([this](const RunMilestone milestone) { report(milestone); });
}

CSSAnimationEventReporter::~CSSAnimationEventReporter() {
  progressProvider_->onMilestone(nullptr);
}

void CSSAnimationEventReporter::cancel(const double timestamp) {
  cancelTimestamp_ = timestamp;
  progressProvider_->abort();
}

void CSSAnimationEventReporter::report(const RunMilestone milestone) {
  switch (milestone) {
    case RunMilestone::Started:
      emit(CSSEventType::AnimationStart, startElapsedTime());
      break;
    case RunMilestone::Repeated:
      emit(CSSEventType::AnimationIteration, iterationElapsedTime());
      break;
    case RunMilestone::Ended:
      emit(CSSEventType::AnimationEnd, endElapsedTime());
      break;
    case RunMilestone::Aborted:
      emit(CSSEventType::AnimationCancel, cancelElapsedTime());
      break;
    case RunMilestone::Created:
      // Animations have no creation event, unlike transitions.
      break;
  }
}

void CSSAnimationEventReporter::emit(const CSSEventType type, const double elapsedTime) const {
  if (!hasListener(eventMask_, type)) {
    return;
  }
  observer_.onAnimationEvent(viewTag_, animationName_, type, elapsedTime);
}

double CSSAnimationEventReporter::startElapsedTime() const {
  // A negative delay starts the animation partway through.
  const auto elapsedTime = std::max(0.0, -progressProvider_->getDelay());
  const auto iterationCount = progressProvider_->getIterationCount();

  // An infinite animation has no total duration to be capped against.
  if (iterationCount < 0) {
    return elapsedTime;
  }
  return std::min(elapsedTime, progressProvider_->getDuration() * iterationCount);
}

double CSSAnimationEventReporter::iterationElapsedTime() const {
  return (progressProvider_->getCurrentIteration() - 1) * progressProvider_->getDuration();
}

double CSSAnimationEventReporter::endElapsedTime() const {
  return progressProvider_->getDuration() * progressProvider_->getIterationCount();
}

double CSSAnimationEventReporter::cancelElapsedTime() const {
  return std::max(0.0, cancelTimestamp_ - progressProvider_->getStartTimestamp(cancelTimestamp_));
}

} // namespace reanimated::css
