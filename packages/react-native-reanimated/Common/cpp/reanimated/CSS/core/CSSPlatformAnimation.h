#pragma once

#include <memory>

namespace reanimated::css {

class CSSPlatformAnimation {
 public:
  virtual ~CSSPlatformAnimation() = default;

  virtual void schedule() = 0;
  virtual void unschedule() = 0;
};

} // namespace reanimated::css
