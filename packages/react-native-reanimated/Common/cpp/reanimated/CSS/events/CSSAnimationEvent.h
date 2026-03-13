#pragma once

#include <react/renderer/core/ReactPrimitives.h>

#include <cstdint>
#include <memory>
#include <string>

namespace reanimated::css {

class CSSAnimation;

enum class CSSAnimationEventType : std::uint8_t {
  AnimationStart = 1 << 0,
  AnimationEnd = 1 << 1,
  AnimationIteration = 1 << 2
};

// Bitmask of CSSAnimationEventType values representing which events a view
// is listening for. A value of 0 means no listeners are registered.
using CSSAnimationEventListeners = std::uint8_t;

inline bool hasListener(CSSAnimationEventListeners listeners, CSSAnimationEventType type) {
  return (listeners & static_cast<std::uint8_t>(type)) != 0;
}

struct CSSAnimationEvent {
  facebook::react::Tag viewTag;
  CSSAnimationEventType type;
  std::string animationName;
  double elapsedTime; // in milliseconds (convert to seconds at dispatch time)
};

CSSAnimationEvent createAnimationStartEvent(
    facebook::react::Tag viewTag,
    const std::shared_ptr<CSSAnimation> &animation);
CSSAnimationEvent createAnimationIterationEvent(
    facebook::react::Tag viewTag,
    const std::shared_ptr<CSSAnimation> &animation,
    unsigned iteration);
CSSAnimationEvent createAnimationEndEvent(facebook::react::Tag viewTag, const std::shared_ptr<CSSAnimation> &animation);

} // namespace reanimated::css
