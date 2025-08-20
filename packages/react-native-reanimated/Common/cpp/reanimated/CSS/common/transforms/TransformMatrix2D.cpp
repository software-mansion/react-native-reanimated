#include <reanimated/CSS/common/transforms/TransformMatrix2D.h>

namespace reanimated::css {

TransformMatrix2D::Decomposed TransformMatrix2D::Decomposed::interpolate(
    const double progress,
    const TransformMatrix2D::Decomposed &other) const {
  return {
      .scale = scale.interpolate(progress, other.scale),
      .skew = skew + (other.skew - skew) * progress,
      .rotation = rotation + (other.rotation - rotation) * progress,
      .translation = translation.interpolate(progress, other.translation)};
}

#ifndef NDEBUG

std::ostream &operator<<(
    std::ostream &os,
    const TransformMatrix2D::Decomposed &decomposed) {
  os << "TransformMatrix2D::Decomposed(scale=" << decomposed.scale
     << ", skew=" << decomposed.skew << ", rotation=" << decomposed.rotation
     << ", translation=" << decomposed.translation << ")";
  return os;
}

#endif // NDEBUG

TransformMatrix2D TransformMatrix2D::Identity() {
  // clang-format off
  return TransformMatrix2D({
    1, 0, 0,
    0, 1, 0,
    0, 0, 1
  });
  // clang-format on
}

template <>
TransformMatrix2D TransformMatrix2D::create<TransformOp::Rotate>(double v) {
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

template <>
TransformMatrix2D TransformMatrix2D::create<TransformOp::Scale>(double v) {
  // clang-format off
  return TransformMatrix2D({
    v, 0, 0,
    0, v, 0,
    0, 0, 1
  });
  // clang-format on
}

template <>
TransformMatrix2D TransformMatrix2D::create<TransformOp::ScaleX>(double v) {
  // clang-format off
  return TransformMatrix2D({
    v, 0, 0,
    0, 1, 0,
    0, 0, 1
  });
  // clang-format on
}

template <>
TransformMatrix2D TransformMatrix2D::create<TransformOp::ScaleY>(double v) {
  // clang-format off
  return TransformMatrix2D({
    1, 0, 0,
    0, v, 0,
    0, 0, 1
  });
  // clang-format on
}

template <>
TransformMatrix2D TransformMatrix2D::create<TransformOp::TranslateX>(double v) {
  // clang-format off
  return TransformMatrix2D({
    1, 0, 0,
    0, 1, 0,
    v, 0, 1
  });
  // clang-format on
}

template <>
TransformMatrix2D TransformMatrix2D::create<TransformOp::TranslateY>(double v) {
  // clang-format off
  return TransformMatrix2D({
    1, 0, 0,
    0, 1, 0,
    0, v, 1
  });
  // clang-format on
}

template <>
TransformMatrix2D TransformMatrix2D::create<TransformOp::SkewX>(double v) {
  const auto tanVal = std::tan(v);
  // clang-format off
  return TransformMatrix2D({
        1, 0, 0,
   tanVal, 1, 0,
        0, 0, 1
  });
  // clang-format on
}

template <>
TransformMatrix2D TransformMatrix2D::create<TransformOp::SkewY>(double v) {
  const auto tanVal = std::tan(v);
  // clang-format off
  return TransformMatrix2D({
    1, tanVal, 0,
    0,      1, 0,
    0,      0, 1
  });
  // clang-format on
}

template <TransformOp TOperation>
TransformMatrix2D TransformMatrix2D::create(double value) {
  throw std::invalid_argument(
      "[Reanimated] Cannot create TransformMatrix2D from: " +
      getOperationNameFromType(TOperation));
}

bool TransformMatrix2D::operator==(const TransformMatrix2D &other) const {
  return matrix_ == other.matrix_;
}

double TransformMatrix2D::determinant() const {
  return (matrix_[0] * matrix_[4] * matrix_[8]) +
      (matrix_[1] * matrix_[5] * matrix_[6]) +
      (matrix_[2] * matrix_[3] * matrix_[7]) -
      (matrix_[2] * matrix_[4] * matrix_[6]) -
      (matrix_[1] * matrix_[3] * matrix_[8]) -
      (matrix_[0] * matrix_[5] * matrix_[7]);
}

void TransformMatrix2D::translate2d(const Vector2D &translation) {
  for (size_t i = 0; i < 3; ++i) {
    matrix_[6 + i] +=
        translation[0] * matrix_[i] + translation[1] * matrix_[3 + i];
  }
}

void TransformMatrix2D::scale2d(const Vector2D &scale) {
  for (size_t i = 0; i < 3; ++i) {
    matrix_[i] *= scale[0];
    matrix_[3 + i] *= scale[1];
  }
}

std::optional<TransformMatrix2D::Decomposed> TransformMatrix2D::decompose()
    const {
  auto matrixCp = *this;

  if (!matrixCp.normalize()) {
    return std::nullopt;
  }

  const auto translation = matrixCp.getTranslation();

  // Take the 2×2 linear part into two column vectors (col-major)
  std::array<Vector2D, 2> rows;
  for (size_t i = 0; i < 2; ++i) {
    rows[i] = Vector2D(matrixCp[i * 3], matrixCp[i * 3 + 1]);
  }

  auto [scale, skew] = computeScaleAndSkew(rows);

  // At this point, the matrix (in rows) is orthonormal.
  // Check for a coordinate system flip. If the determinant
  // is negative, then negate the matrix and the scaling factors.
  if (rows[0].cross(rows[1]) < 0) {
    scale *= -1;
    for (auto &row : rows) {
      row *= -1;
    }
  }

  const auto rotation = computeRotation(rows);

  return TransformMatrix2D::Decomposed{
      .scale = scale,
      .skew = skew,
      .rotation = rotation,
      .translation = translation};
}

TransformMatrix2D TransformMatrix2D::recompose(
    const TransformMatrix2D::Decomposed &decomposed) {
  auto result = TransformMatrix2D::Identity();

  // Apply Translation
  result.translate2d(decomposed.translation);

  // Apply Rotation
  const auto rotationMatrix =
      TransformMatrix2D::create<TransformOp::Rotate>(decomposed.rotation);
  result = rotationMatrix * result;

  // Apply XY shear
  if (decomposed.skew != 0) {
    auto tmp = TransformMatrix2D::Identity();
    tmp[3] = decomposed.skew;
    result = tmp * result;
  }

  // Apply Scale
  result.scale2d(decomposed.scale);

  return result;
}

Vector2D TransformMatrix2D::getTranslation() const {
  return Vector2D(matrix_[6], matrix_[7]);
}

std::pair<Vector2D, double> TransformMatrix2D::computeScaleAndSkew(
    std::array<Vector2D, 2> &rows) {
  Vector2D scale;

  // Compute X scale and normalize first row
  scale[0] = rows[0].length();
  rows[0].normalize();

  // Compute XY shear and orthogonalize second row against first
  double skew = rows[0].dot(rows[1]);
  rows[1] = rows[1].addScaled(rows[0], -skew);

  // Now, compute Y scale and normalize second row
  scale[1] = rows[1].length();
  rows[1].normalize();

  // Next, Normalize shear by Y scale
  skew /= scale[1];

  return {scale, skew};
}

double TransformMatrix2D::computeRotation(std::array<Vector2D, 2> &rows) {
  // For 2D, we can compute rotation directly from the orthonormal matrix
  // The rotation angle is atan2(m10, m00) where m10 is rows[1][0] and m00 is
  // rows[0][0]
  return std::atan2(rows[1][0], rows[0][0]);
}

} // namespace reanimated::css
