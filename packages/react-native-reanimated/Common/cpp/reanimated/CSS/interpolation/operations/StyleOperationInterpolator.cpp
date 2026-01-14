#include <reanimated/CSS/interpolation/operations/StyleOperationInterpolator.h>

namespace reanimated::css {

StyleOperationInterpolator::StyleOperationInterpolator(const std::shared_ptr<StyleOperation> &defaultOperation)
    : defaultOperation_(defaultOperation) {}

std::shared_ptr<StyleOperation> StyleOperationInterpolator::getDefaultOperation() const {
  return defaultOperation_;
}

std::shared_ptr<StyleOperation> StyleOperationInterpolator::resolveOperation(
    const std::shared_ptr<StyleOperation> &operation,
    const StyleOperationsInterpolationContext &context) const {
  return operation;
}

} // namespace reanimated::css
