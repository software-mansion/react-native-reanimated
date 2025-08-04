#pragma once

#include <reanimated/CSS/interpolation/transforms/TransformsStyleInterpolator.h>

#include <reanimated/CSS/svg/interpolation/transforms/TransformOperation.h>

namespace reanimated::css {

class SVGTransformsInterpolator final : public TransformsStyleInterpolator {
 protected:
  folly::dynamic convertResultToDynamic(
      const TransformOperations &operations) const override;
  TransformOperation operationFrom(jsi::Runtime &rt, const jsi::Value &value)
      const override;
  TransformOperation operationFrom(const folly::dynamic &value) const override;
};

} // namespace reanimated::css
