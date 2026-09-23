#pragma once

#include <react/debug/react_native_assert.h>
#include <react/renderer/core/ReactPrimitives.h>

#include <cstdint>
#include <limits>
#include <string>
#include <utility>

namespace reanimated::css {

/// Event kinds a view can subscribe to. The ordinal is the bit index in
/// `CSSEventMask`, so the JS side must keep its bitmask constants in sync, and
/// a new kind has to fit the mask as well as the switches over this enum.
enum class CSSEventType : std::uint8_t {
  AnimationStart = 0,
  AnimationEnd = 1,
  AnimationIteration = 2,
  AnimationCancel = 3,
  TransitionRun = 4,
  TransitionStart = 5,
  TransitionEnd = 6,
  TransitionCancel = 7,
};

using CSSEventMask = std::uint8_t;

inline bool hasListener(const CSSEventMask mask, const CSSEventType type) {
  const auto bit = static_cast<std::uint8_t>(type);
  // A type that does not fit the mask would silently never have a listener.
  react_native_assert(bit < std::numeric_limits<CSSEventMask>::digits);
  return (mask & (1U << bit)) != 0;
}

struct CSSEvent {
  facebook::react::Tag viewTag;
  CSSEventType type;
  /// Animation name for animation events, RN property name for transition ones.
  std::string name;
  /// Seconds, matching the public `elapsedTime` contract shared with web.
  double elapsedTime;
};

inline CSSEvent createCSSEvent(
    const facebook::react::Tag viewTag,
    const CSSEventType type,
    std::string name,
    const double elapsedTimeMs) {
  return CSSEvent{viewTag, type, std::move(name), elapsedTimeMs / 1000};
}

} // namespace reanimated::css
