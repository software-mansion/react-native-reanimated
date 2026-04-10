#pragma once

#include <reanimated/apple/CSS/keyframes.h>

#include <memory>

namespace reanimated::css {

class CSSPlatformAnimation {
 public:
  virtual ~CSSPlatformAnimation() = default;

  virtual void update(std::shared_ptr<const apple::CAKeyframesMap> data) = 0;

  static std::shared_ptr<CSSPlatformAnimation> create(std::shared_ptr<const apple::CAKeyframesMap> data);
};

} // namespace reanimated::css
