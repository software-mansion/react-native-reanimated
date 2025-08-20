#include <reanimated/CSS/interpolation/transforms/operations/scale.h>

namespace reanimated::css {

// Scale

bool ScaleOperation::canConvertTo(TransformOp type) const {
  return type == TransformOp::ScaleX || type == TransformOp::ScaleY;
}

TransformOperations ScaleOperation::convertTo(TransformOp type) const {
  assertCanConvertTo(type);
  if (type == TransformOp::ScaleX) {
    return {
        std::make_shared<ScaleXOperation>(value),
        std::make_shared<ScaleYOperation>(value)};
  } else {
    return {
        std::make_shared<ScaleYOperation>(value),
        std::make_shared<ScaleXOperation>(value)};
  }
}

TransformMatrix3D ScaleOperation::toMatrix() const {
  return TransformMatrix3D::Scale(value.value);
}

// ScaleX

TransformMatrix3D ScaleXOperation::toMatrix() const {
  return TransformMatrix3D::ScaleX(value.value);
}

// ScaleY

TransformMatrix3D ScaleYOperation::toMatrix() const {
  return TransformMatrix3D::ScaleY(value.value);
}

} // namespace reanimated::css
