#include <reanimated/CSS/common/transforms/TransformMatrix3D.h>
#include <reanimated/CSS/interpolation/transforms/operations/perspective.h>

#include <algorithm>
#include <cmath>
#include <memory>

namespace reanimated::css {

double sanitizePerspectiveValue(double value) {
  if (value < 0) {
    // Round value between -1 and 0 to -1
    return std::min(value, -1.0);
  }
  // Round value between 0 and 1 to 1
  return std::max(value, 1.0);
}

PerspectiveOperation::PerspectiveOperation(const double value)
    : TransformOperationBase<TransformOp::Perspective, CSSDouble>(CSSDouble(sanitizePerspectiveValue(value))) {}

bool PerspectiveOperation::is3D() const {
  return true;
}

folly::dynamic PerspectiveOperation::valueToDynamic() const {
  if (std::isinf(value.value)) {
    return folly::dynamic();
  }
  return value.toDynamic();
}

TransformMatrix::Shared PerspectiveOperation::toMatrix(bool /* force3D */) const {
  if (!cachedMatrix_) {
    // Perspective is a 3D operation
    cachedMatrix_ =
        std::make_shared<const TransformMatrix3D>(TransformMatrix3D::create<TransformOp::Perspective>(value.value));
  }
  return cachedMatrix_;
}

} // namespace reanimated::css
