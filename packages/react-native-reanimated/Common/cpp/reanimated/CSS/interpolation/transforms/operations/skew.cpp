#include <reanimated/CSS/interpolation/transforms/operations/skew.h>

namespace reanimated::css {

// SkewX

TransformMatrix3D SkewXOperation::toMatrix() const {
  return TransformMatrix3D::SkewX(value.value);
}

// SkewY

TransformMatrix3D SkewYOperation::toMatrix() const {
  return TransformMatrix3D::SkewY(value.value);
}

} // namespace reanimated::css
