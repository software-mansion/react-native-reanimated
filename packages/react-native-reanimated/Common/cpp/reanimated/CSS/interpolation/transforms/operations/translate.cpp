#include <reanimated/CSS/interpolation/transforms/operations/translate.h>

namespace reanimated::css {

// TranslateX

TransformMatrix3D TranslateXOperation::toMatrix() const {
  if (value.isRelative) {
    throw std::invalid_argument(
        "[Reanimated] Cannot convert relative translateX to the matrix.");
  }
  return TransformMatrix3D::TranslateX(value.value);
}

// TranslateY

TransformMatrix3D TranslateYOperation::toMatrix() const {
  if (value.isRelative) {
    throw std::invalid_argument(
        "[Reanimated] Cannot convert relative translateY to the matrix.");
  }
  return TransformMatrix3D::TranslateY(value.value);
}

} // namespace reanimated::css
