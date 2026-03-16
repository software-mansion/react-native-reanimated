#pragma once

#include <react/renderer/core/ReactPrimitives.h>

#include <string>

namespace reanimated::css {

struct CSSEvent {
  facebook::react::Tag viewTag;
  std::string type; // e.g. "animationstart", "transitionend"
  std::string targetName; // animation name or property name
  double elapsedTime; // in milliseconds (convert to seconds at dispatch time)
};

} // namespace reanimated::css
