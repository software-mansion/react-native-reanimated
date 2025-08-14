#include <reanimated/CSS/common/TransformMatrix2D.h>

namespace reanimated::css {

TransformMatrix2D TransformMatrix2D::Identity() {
  // clang-format off
  return TransformMatrix2D({
    1, 0, 0,
    0, 1, 0,
    0, 0, 1
  });
  // clang-format on
}

TransformMatrix2D TransformMatrix2D::Rotate(double v) {
  const auto cosVal = std::cos(v);
  const auto sinVal = std::sin(v);
  // clang-format off
  return TransformMatrix2D({
    cosVal, -sinVal, 0,
    sinVal,  cosVal, 0,
        0,        0, 1
  });
  // clang-format on
}

TransformMatrix2D TransformMatrix2D::Scale(double v) {
  // clang-format off
  return TransformMatrix2D({
    v, 0, 0,
    0, v, 0,
    0, 0, 1
  });
  // clang-format on
}

TransformMatrix2D TransformMatrix2D::ScaleX(double v) {
  // clang-format off
  return TransformMatrix2D({
    v, 0, 0,
    0, 1, 0,
    0, 0, 1
  });
  // clang-format on
}

TransformMatrix2D TransformMatrix2D::ScaleY(double v) {
  // clang-format off
  return TransformMatrix2D({
    1, 0, 0,
    0, v, 0,
    0, 0, 1
  });
  // clang-format on
}

TransformMatrix2D TransformMatrix2D::TranslateX(double v) {
  // clang-format off
  return TransformMatrix2D({
    1, 0, 0,
    0, 1, 0,
    v, 0, 1
  });
  // clang-format on
}

TransformMatrix2D TransformMatrix2D::TranslateY(double v) {
  // clang-format off
  return TransformMatrix2D({
    1, 0, 0,
    0, 1, 0,
    0, v, 1
  });
  // clang-format on
}

TransformMatrix2D TransformMatrix2D::SkewX(double v) {
  const auto tanVal = std::tan(v);
  // clang-format off
  return TransformMatrix2D({
        1, 0, 0,
   tanVal, 1, 0,
        0, 0, 1
  });
  // clang-format on
}

TransformMatrix2D TransformMatrix2D::SkewY(double v) {
  const auto tanVal = std::tan(v);
  // clang-format off
  return TransformMatrix2D({
    1, tanVal, 0,
    0,      1, 0,
    0,      0, 1
  });
  // clang-format on
}

} // namespace reanimated::css
