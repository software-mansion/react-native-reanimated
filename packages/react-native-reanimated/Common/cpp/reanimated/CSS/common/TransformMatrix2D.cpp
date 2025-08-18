#include <reanimated/CSS/common/TransformMatrix2D.h>
#include <reanimated/CSS/common/TransformMatrix3D.h>

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

double TransformMatrix2D::determinant() const {
  return (matrix_[0] * matrix_[4] * matrix_[8]) +
      (matrix_[1] * matrix_[5] * matrix_[6]) +
      (matrix_[2] * matrix_[3] * matrix_[7]) -
      (matrix_[2] * matrix_[4] * matrix_[6]) -
      (matrix_[1] * matrix_[3] * matrix_[8]) -
      (matrix_[0] * matrix_[5] * matrix_[7]);
}

std::unique_ptr<TransformMatrix> TransformMatrix2D::expand(
    size_t targetDimension) const {
  if (targetDimension == 3) {
    return std::make_unique<TransformMatrix2D>(*this);
  } else if (targetDimension == 4) {
    std::array<double, 16> matrix4x4{};

    for (size_t i = 0; i < 3; ++i) {
      for (size_t j = 0; j < 3; ++j) {
        matrix4x4[i * 4 + j] = matrix_[i * 3 + j];
      }
    }

    matrix4x4[15] = 1;

    return std::make_unique<TransformMatrix3D>(matrix4x4);
  }

  throw std::invalid_argument(
      "[Reanimated] Cannot convert 2D matrix to dimension " +
      std::to_string(targetDimension));
}

} // namespace reanimated::css
