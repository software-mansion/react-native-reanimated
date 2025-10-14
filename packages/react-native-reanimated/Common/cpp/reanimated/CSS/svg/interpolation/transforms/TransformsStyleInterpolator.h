#pragma once

#include <reanimated/CSS/interpolation/transforms/TransformsStyleInterpolator.h>

namespace reanimated::css::svg {

class TransformsStyleInterpolator final
    : public css::TransformsStyleInterpolator {
 public:
  TransformsStyleInterpolator(
      const PropertyPath &propertyPath,
      const std::shared_ptr<TransformOperationInterpolators> &interpolators,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository);

 protected:
  folly::dynamic convertOperationsToDynamic(
      const TransformOperations &operations) const override;
};

} // namespace reanimated::css::svg
