#include <reanimated/CSS/common/transforms/TransformMatrix3D.h>
#include <reanimated/CSS/interpolation/transforms/operations/perspective.h>

#include <memory>

namespace reanimated::css {

PerspectiveOperation::PerspectiveOperation(const double value)
    : TransformOperationBase<TransformOp::Perspective, CSSDouble>(CSSDouble(value)) {}

bool PerspectiveOperation::is3D() const {
  return true;
}

folly::dynamic PerspectiveOperation::valueToDynamic() const {
  return value.value != 0 ? value.toDynamic() : folly::dynamic();
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
