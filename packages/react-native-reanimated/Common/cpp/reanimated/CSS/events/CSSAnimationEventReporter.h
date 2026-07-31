#pragma once

#include <reanimated/CSS/core/CSSAnimationObserver.h>
#include <reanimated/CSS/events/CSSEvent.h>
#include <reanimated/CSS/progress/AnimationProgressProvider.h>

#include <memory>
#include <string>

namespace reanimated::css {

/// Turns the milestones a run reports into CSS animation events.
class CSSAnimationEventReporter {
 public:
  CSSAnimationEventReporter(
      Tag viewTag,
      std::string animationName,
      CSSAnimationObserver &observer,
      const std::shared_ptr<AnimationProgressProvider> &progressProvider);

  ~CSSAnimationEventReporter();

  // The milestone subscription is tied to this object's lifetime.
  CSSAnimationEventReporter(const CSSAnimationEventReporter &) = delete;
  CSSAnimationEventReporter &operator=(const CSSAnimationEventReporter &) = delete;

  void setMask(const CSSEventMask eventMask) {
    eventMask_ = eventMask;
  }

  void cancel(double timestamp);

 private:
  const Tag viewTag_;
  const std::string animationName_;
  CSSAnimationObserver &observer_;
  const std::shared_ptr<AnimationProgressProvider> progressProvider_;

  CSSEventMask eventMask_{0};
  // The lifecycle reports an abort without a timestamp, so cancel() leaves one here.
  double cancelTimestamp_{0};

  void report(RunMilestone milestone);
  void emit(CSSEventType type, double elapsedTime) const;

  double startElapsedTime() const;
  double iterationElapsedTime() const;
  double endElapsedTime() const;
  double cancelElapsedTime() const;
};

} // namespace reanimated::css
