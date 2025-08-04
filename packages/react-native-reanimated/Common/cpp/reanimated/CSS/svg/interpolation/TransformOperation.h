#pragma once

#include <reanimated/CSS/interpolation/transforms/TransformOperation.h>

#include <reanimated/CSS/svg/values/SVGLength.h>

namespace reanimated::css {

struct TransformOperationSVG : public TransformOperation {
  static std::shared_ptr<TransformOperation> from(
      jsi::Runtime &rt,
      const jsi::Value &value);
  static std::shared_ptr<TransformOperation> from(const folly::dynamic &value);
};

} // namespace reanimated::css
