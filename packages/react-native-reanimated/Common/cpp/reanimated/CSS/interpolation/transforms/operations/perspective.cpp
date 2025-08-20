#include <reanimated/CSS/interpolation/transforms/operations/perspective.h>

namespace reanimated::css {

folly::dynamic PerspectiveOperation::valueToDynamic() const {
  // Perspective cannot be 0, so we return undefined in this case
  return value.value != 0 ? value.toDynamic() : folly::dynamic();
}

TransformMatrix3D PerspectiveOperation::toMatrix() const {
  return TransformMatrix3D::Perspective(value.value);
}

} // namespace reanimated::css
