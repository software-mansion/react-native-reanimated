#pragma once

#include <reanimated/CSS/events/CSSEvent.h>

#include <react/renderer/core/ReactPrimitives.h>

#include <string>

namespace reanimated::css {

using facebook::react::Tag;

/// What a running animation reports to whoever owns it.
class CSSAnimationObserver {
 public:
  virtual ~CSSAnimationObserver() = default;

  virtual void onAnimationUpdate(Tag viewTag) = 0;
  // Called when the animation finishes without `forwards` fill mode and will
  // need to be reverted to the underlying style on the next flush.
  virtual void onAnimationNeedsRevert(Tag viewTag) = 0;
  virtual void
  onAnimationEvent(Tag viewTag, const std::string &animationName, CSSEventType type, double elapsedTimeMs) = 0;
};

} // namespace reanimated::css
