#include <reanimated/CSS/svg/interpolation/transforms/TransformsStyleInterpolator.h>

namespace reanimated::css::svg {

TransformsStyleInterpolator::TransformsStyleInterpolator(
    const PropertyPath &propertyPath,
    const std::shared_ptr<TransformOperationInterpolators> &interpolators,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository)
    : css::TransformsStyleInterpolator(
          propertyPath,
          interpolators,
          viewStylesRepository) {}

folly::dynamic TransformsStyleInterpolator::convertOperationsToDynamic(
    const TransformOperations &operations) const {
  const auto matrix = matrixFromOperations2D(operations);
  // SVGs expect a 6-element array with 2D transform values
  return folly::dynamic::array(
      matrix[0], matrix[1], matrix[3], matrix[4], matrix[6], matrix[7]);
}

} // namespace reanimated::css::svg
