#pragma once

namespace reanimated::css {

class CSSPlatformAnimation {
 public:
  virtual ~CSSPlatformAnimation() = default;

  virtual void schedule(double startTimestamp) = 0;
  virtual void unschedule() = 0;
};

} // namespace reanimated::css
