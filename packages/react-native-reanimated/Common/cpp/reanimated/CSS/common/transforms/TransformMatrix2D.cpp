#include <reanimated/CSS/common/transforms/TransformMatrix2D.h>

#include <cmath>

namespace reanimated::css {

TransformMatrix2D::TransformMatrix2D(jsi::Runtime &rt, const jsi::Value &value)
    : TransformMatrixBase<TransformMatrix2D, MATRIX_2D_DIMENSION>() {
  const auto &array = value.asObject(rt).asArray(rt);
  const auto size = array.size(rt);

  if (size == SIZE) {
    // Direct 3x3 matrix
    for (size_t i = 0; i < SIZE; ++i) {
      matrix_[i] = array.getValueAtIndex(rt, i).asNumber();
    }
  } else if (size == 16) {
    // Convert 4x4 matrix to 3x3
    // (we should call canConstruct first to ensure that the matrix is
    // convertible to 3x3)
    //
    // [m[0], m[1], 0, m[2]]     [m[0], m[1], m[2]]
    // [m[3], m[4], 0, m[5]]  -> [m[3], m[4], m[5]]
    // [  0,   0,  1,   0]       [m[6], m[7], m[8]]
    // [m[6], m[7], 0, m[8]]
    matrix_[0] = array.getValueAtIndex(rt, 0).asNumber();
    matrix_[1] = array.getValueAtIndex(rt, 1).asNumber();
    matrix_[2] = array.getValueAtIndex(rt, 3).asNumber();
    matrix_[3] = array.getValueAtIndex(rt, 4).asNumber();
    matrix_[4] = array.getValueAtIndex(rt, 5).asNumber();
    matrix_[5] = array.getValueAtIndex(rt, 7).asNumber();
    matrix_[6] = array.getValueAtIndex(rt, 12).asNumber();
    matrix_[7] = array.getValueAtIndex(rt, 13).asNumber();
    matrix_[8] = array.getValueAtIndex(rt, 15).asNumber();
  } else {
    throw std::invalid_argument("[Reanimated] TransformMatrix2D: Invalid matrix size: " + std::to_string(size));
  }
}

TransformMatrix2D::TransformMatrix2D(const folly::dynamic &array)
    : TransformMatrixBase<TransformMatrix2D, MATRIX_2D_DIMENSION>() {
  const auto size = array.size();

  if (size == SIZE) {
    // Direct 3x3 matrix
    for (size_t i = 0; i < SIZE; ++i) {
      matrix_[i] = array[i].asDouble();
    }
  } else if (size == 16) {
    // Convert 4x4 matrix to 3x3
    // (we should call canConstruct first to ensure that the matrix is
    // convertible to 3x3)
    //
    // [m[0], m[1], 0, m[2]]     [m[0], m[1], m[2]]
    // [m[3], m[4], 0, m[5]]  -> [m[3], m[4], m[5]]
    // [  0,   0,  1,   0]       [m[6], m[7], m[8]]
    // [m[6], m[7], 0, m[8]]
    matrix_[0] = array[0].asDouble();
    matrix_[1] = array[1].asDouble();
    matrix_[2] = array[3].asDouble();
    matrix_[3] = array[4].asDouble();
    matrix_[4] = array[5].asDouble();
    matrix_[5] = array[7].asDouble();
    matrix_[6] = array[12].asDouble();
    matrix_[7] = array[13].asDouble();
    matrix_[8] = array[15].asDouble();
  } else {
    throw std::invalid_argument("[Reanimated] TransformMatrix2D: Invalid matrix size: " + std::to_string(size));
  }
}

bool TransformMatrix2D::canConstruct(jsi::Runtime &rt, const jsi::Value &value) {
  if (!value.isObject()) {
    return false;
  }

  const auto &obj = value.asObject(rt);
  if (!obj.isArray(rt)) {
    return false;
  }

  const auto &array = obj.asArray(rt);
  const auto size = array.size(rt);

  // Check if it's a 3x3 matrix (9 elements)
  if (size == 9) {
    return true;
  }

  // Check if it's a 4x4 matrix (16 elements) that can be converted to 2D
  if (size == 16) {
    // A 4x4 matrix can be converted to 2D if it has this pattern
    // (where x means any number)
    // [x, x, 0, x]
    // [x, x, 0, x]
    // [0, 0, 1, 0]
    // [x, x, 0, x]
    return array.getValueAtIndex(rt, 2).asNumber() == 0.0 && array.getValueAtIndex(rt, 6).asNumber() == 0.0 &&
        array.getValueAtIndex(rt, 10).asNumber() == 1.0 && array.getValueAtIndex(rt, 11).asNumber() == 0.0 &&
        array.getValueAtIndex(rt, 14).asNumber() == 0.0 && array.getValueAtIndex(rt, 15).asNumber() == 1.0;
  }

  return false;
}

bool TransformMatrix2D::canConstruct(const folly::dynamic &array) {
  if (!array.isArray()) {
    return false;
  }
  const auto size = array.size();

  // Check if it's a 3x3 matrix (9 elements)
  if (size == 9) {
    return true;
  }

  // Check if it's a 4x4 matrix (16 elements) that can be converted to 2D
  if (size == 16) {
    // A 4x4 matrix can be converted to 2D if it has this pattern:
    // (where x means any number)
    // [x, x, 0, x]
    // [x, x, 0, x]
    // [0, 0, 1, 0]
    // [x, x, 0, x]
    return array[2].asDouble() == 0.0 && array[6].asDouble() == 0.0 && array[10].asDouble() == 1.0 &&
        array[11].asDouble() == 0.0 && array[14].asDouble() == 0.0 && array[15].asDouble() == 1.0;
  }

  return false;
}

TransformMatrix2D::Decomposed TransformMatrix2D::Decomposed::interpolate(
    const double progress,
    const TransformMatrix2D::Decomposed &target) const {
  // Compute shortest signed angular delta (in range −π..π]
  const double angleDelta = std::remainder(target.rotation - rotation, 2.0 * M_PI);

  return {
      .scale = scale.interpolate(progress, target.scale),
      .skew = skew + (target.skew - skew) * progress,
      .rotation = rotation + progress * angleDelta,
      .translation = translation.interpolate(progress, target.translation),
  };
}

#ifndef NDEBUG

std::ostream &operator<<(std::ostream &os, const TransformMatrix2D::Decomposed &decomposed) {
  os << "TransformMatrix2D::Decomposed(scale=" << decomposed.scale << ", skew=" << decomposed.skew
     << ", rotation=" << decomposed.rotation << ", translation=" << decomposed.translation << ")";
  return os;
}

#endif // NDEBUG

template <>
TransformMatrix2D TransformMatrix2D::create<TransformOp::Rotate>(double v) {
  const auto cosVal = std::cos(v);
  const auto sinVal = std::sin(v);
  // clang-format off
  return TransformMatrix2D({
     cosVal, sinVal, 0,
    -sinVal, cosVal, 0,
          0,      0, 1
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
      "[Reanimated] Cannot create TransformMatrix2D from: " + getTransformOperationName(TOperation));
}

double TransformMatrix2D::determinant() const {
  return (matrix_[0] * matrix_[4] * matrix_[8]) + (matrix_[1] * matrix_[5] * matrix_[6]) +
      (matrix_[2] * matrix_[3] * matrix_[7]) - (matrix_[2] * matrix_[4] * matrix_[6]) -
      (matrix_[1] * matrix_[3] * matrix_[8]) - (matrix_[0] * matrix_[5] * matrix_[7]);
}

void TransformMatrix2D::translate2d(const Vector2D &translation) {
  for (size_t i = 0; i < 3; ++i) {
    matrix_[6 + i] += translation[0] * matrix_[i] + translation[1] * matrix_[3 + i];
  }
}

void TransformMatrix2D::scale2d(const Vector2D &scale) {
  for (size_t i = 0; i < 3; ++i) {
    matrix_[i] *= scale[0];
    matrix_[3 + i] *= scale[1];
  }
}

std::optional<TransformMatrix2D::Decomposed> TransformMatrix2D::decompose() const {
  auto matrixCp = *this;

  if (!matrixCp.normalize()) {
    return std::nullopt;
  }

  const auto translation = matrixCp.getTranslation();

  // Take the 2×2 linear part into two column vectors
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

  return TransformMatrix2D::Decomposed{.scale = scale, .skew = skew, .rotation = rotation, .translation = translation};
}

TransformMatrix2D TransformMatrix2D::recompose(const TransformMatrix2D::Decomposed &decomposed) {
  auto result = TransformMatrix2D();

  // Apply Translation
  result.translate2d(decomposed.translation);

  // Apply Rotation
  if (decomposed.rotation != 0) {
    const auto rotationMatrix = TransformMatrix2D::create<TransformOp::Rotate>(decomposed.rotation);
    result = rotationMatrix * result;
  }

  // Apply XY shear
  if (decomposed.skew != 0) {
    auto tmp = TransformMatrix2D();
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

std::pair<Vector2D, double> TransformMatrix2D::computeScaleAndSkew(std::array<Vector2D, 2> &rows) {
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
  // The rotation angle is atan2(m01, m00) where m01 is rows[0][1] and m00 is
  // rows[0][0]
  return std::atan2(rows[0][1], rows[0][0]);
}
// Explicit template instantiations for unsupported operations
// These will use the fallback template function that throws an error
template TransformMatrix2D TransformMatrix2D::create<TransformOp::Perspective>(double);
template TransformMatrix2D TransformMatrix2D::create<TransformOp::RotateX>(double);
template TransformMatrix2D TransformMatrix2D::create<TransformOp::RotateY>(double);
template TransformMatrix2D TransformMatrix2D::create<TransformOp::RotateZ>(double);

} // namespace reanimated::css
