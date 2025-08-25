#include <reanimated/CSS/common/transforms/TransformMatrix3D.h>
#include <reanimated/CSS/interpolation/transforms/TransformOperation.h>

namespace reanimated::css {

TransformMatrix3D::Decomposed TransformMatrix3D::Decomposed::interpolate(
    const double progress,
    const TransformMatrix3D::Decomposed &other) const {
  return {
      .scale = scale.interpolate(progress, other.scale),
      .skew = skew.interpolate(progress, other.skew),
      .quaternion = quaternion.interpolate(progress, other.quaternion),
      .translation = translation.interpolate(progress, other.translation),
      .perspective = perspective.interpolate(progress, other.perspective)};
}

#ifndef NDEBUG

std::ostream &operator<<(
    std::ostream &os,
    const TransformMatrix3D::Decomposed &decomposed) {
  os << "TransformMatrix3D::Decomposed(scale=" << decomposed.scale
     << ", skew=" << decomposed.skew << ", quaternion=" << decomposed.quaternion
     << ", translation=" << decomposed.translation
     << ", perspective=" << decomposed.perspective << ")";
  return os;
}

#endif // NDEBUG

TransformMatrix3D TransformMatrix3D::Identity() {
  // clang-format off
  return TransformMatrix3D({
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
  });
  // clang-format on
}

// Template specializations for TransformMatrix3D::create
template <>
TransformMatrix3D TransformMatrix3D::create<TransformOp::Perspective>(
    double v) {
  if (v == 0) {
    // Ignore perspective if it is invalid
    return TransformMatrix3D::Identity();
  }
  // clang-format off
  return TransformMatrix3D({
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, -1.0 / v,
    0, 0, 0, 1
  });
  // clang-format on
}

template <>
TransformMatrix3D TransformMatrix3D::create<TransformOp::RotateX>(double v) {
  const auto cosVal = std::cos(v);
  const auto sinVal = std::sin(v);
  // clang-format off
  return TransformMatrix3D({
    1,       0,      0, 0,
    0,  cosVal, sinVal, 0,
    0, -sinVal, cosVal, 0,
    0,       0,      0, 1
  });
  // clang-format on
}

template <>
TransformMatrix3D TransformMatrix3D::create<TransformOp::RotateY>(double v) {
  const auto cosVal = std::cos(v);
  const auto sinVal = std::sin(v);
  // clang-format off
  return TransformMatrix3D({
    cosVal, 0, -sinVal, 0,
         0, 1,       0, 0,
    sinVal, 0,  cosVal, 0,
         0, 0,       0, 1
  });
  // clang-format on
}

template <>
TransformMatrix3D TransformMatrix3D::create<TransformOp::RotateZ>(double v) {
  const auto cosVal = std::cos(v);
  const auto sinVal = std::sin(v);
  // clang-format off
  return TransformMatrix3D({
     cosVal, sinVal, 0, 0,
    -sinVal, cosVal, 0, 0,
          0,      0, 1, 0,
          0,      0, 0, 1
  });
  // clang-format on
}

template <>
TransformMatrix3D TransformMatrix3D::create<TransformOp::Rotate>(double v) {
  return TransformMatrix3D::create<TransformOp::RotateZ>(v);
}

template <>
TransformMatrix3D TransformMatrix3D::create<TransformOp::Scale>(double v) {
  // clang-format off
  return TransformMatrix3D({
    v, 0, 0, 0,
    0, v, 0, 0,
    0, 0, v, 0,
    0, 0, 0, 1
  });
  // clang-format on
}

template <>
TransformMatrix3D TransformMatrix3D::create<TransformOp::ScaleX>(double v) {
  // clang-format off
  return TransformMatrix3D({
    v, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
  });
  // clang-format on
}

template <>
TransformMatrix3D TransformMatrix3D::create<TransformOp::ScaleY>(double v) {
  // clang-format off
  return TransformMatrix3D({
    1, 0, 0, 0,
    0, v, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
  });
  // clang-format on
}

template <>
TransformMatrix3D TransformMatrix3D::create<TransformOp::TranslateX>(double v) {
  // clang-format off
  return TransformMatrix3D({
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    v, 0, 0, 1
  });
  // clang-format on
}

template <>
TransformMatrix3D TransformMatrix3D::create<TransformOp::TranslateY>(double v) {
  // clang-format off
  return TransformMatrix3D({
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, v, 0, 1
  });
  // clang-format on
}

template <>
TransformMatrix3D TransformMatrix3D::create<TransformOp::SkewX>(double v) {
  const auto tanVal = std::tan(v);
  // clang-format off
  return TransformMatrix3D({
         1, 0, 0, 0,
    tanVal, 1, 0, 0,
         0, 0, 1, 0,
         0, 0, 0, 1
  });
  // clang-format on
}

template <>
TransformMatrix3D TransformMatrix3D::create<TransformOp::SkewY>(double v) {
  const auto tanVal = std::tan(v);
  // clang-format off
  return TransformMatrix3D({
    1, tanVal, 0, 0,
    0,      1, 0, 0,
    0,      0, 1, 0,
    0,      0, 0, 1
  });
  // clang-format on
}

template <TransformOp TOperation>
TransformMatrix3D TransformMatrix3D::create(double value) {
  throw std::invalid_argument(
      "[Reanimated] Cannot create TransformMatrix3D from: " +
      getOperationNameFromType(TOperation));
}

bool TransformMatrix3D::operator==(const TransformMatrix3D &other) const {
  return matrix_ == other.matrix_;
}

Vector4D operator*(const Vector4D &v, const TransformMatrix3D &m) {
  Vector4D result;

  for (size_t i = 0; i < 4; ++i) {
    for (size_t j = 0; j < 4; ++j) {
      result[i] += v[j] * m[j * 4 + i];
    }
  }

  return result;
}

#ifndef NDEBUG

std::ostream &operator<<(std::ostream &os, const TransformMatrix3D &matrix) {
  std::string result = "TransformMatrix3D{";
  for (size_t i = 0; i < 16; ++i) {
    result += std::to_string(matrix[i]);
    if (i < 15) {
      result += ", ";
    }
  }
  result += "}";
  return os << result;
}

#endif // NDEBUG

/**
 * Calculates the determinant of the 4x4 matrix using the minor (Laplace
 * expansion) method.
 *
 * | a1 a2 a3 a4 |
 * | b1 b2 b3 b4 |
 * | c1 c2 c3 c4 |
 * | d1 d2 d3 d4 |
 */
double TransformMatrix3D::determinant() const {
  const double a1 = matrix_[0];
  const double b1 = matrix_[1];
  const double c1 = matrix_[2];
  const double d1 = matrix_[3];

  const double a2 = matrix_[4];
  const double b2 = matrix_[5];
  const double c2 = matrix_[6];
  const double d2 = matrix_[7];

  const double a3 = matrix_[8];
  const double b3 = matrix_[9];
  const double c3 = matrix_[10];
  const double d3 = matrix_[11];

  const double a4 = matrix_[12];
  const double b4 = matrix_[13];
  const double c4 = matrix_[14];
  const double d4 = matrix_[15];

  return a1 * determinant3x3(b2, b3, b4, c2, c3, c4, d2, d3, d4) -
      b1 * determinant3x3(a2, a3, a4, c2, c3, c4, d2, d3, d4) +
      c1 * determinant3x3(a2, a3, a4, b2, b3, b4, d2, d3, d4) -
      d1 * determinant3x3(a2, a3, a4, b2, b3, b4, c2, c3, c4);
}

void TransformMatrix3D::adjugate() {
  const double a1 = matrix_[0];
  const double b1 = matrix_[1];
  const double c1 = matrix_[2];
  const double d1 = matrix_[3];

  const double a2 = matrix_[4];
  const double b2 = matrix_[5];
  const double c2 = matrix_[6];
  const double d2 = matrix_[7];

  const double a3 = matrix_[8];
  const double b3 = matrix_[9];
  const double c3 = matrix_[10];
  const double d3 = matrix_[11];

  const double a4 = matrix_[12];
  const double b4 = matrix_[13];
  const double c4 = matrix_[14];
  const double d4 = matrix_[15];

  matrix_[0] = determinant3x3(b2, b3, b4, c2, c3, c4, d2, d3, d4);
  matrix_[4] = -determinant3x3(a2, a3, a4, c2, c3, c4, d2, d3, d4);
  matrix_[8] = determinant3x3(a2, a3, a4, b2, b3, b4, d2, d3, d4);
  matrix_[12] = -determinant3x3(a2, a3, a4, b2, b3, b4, c2, c3, c4);

  matrix_[1] = -determinant3x3(b1, b3, b4, c1, c3, c4, d1, d3, d4);
  matrix_[5] = determinant3x3(a1, a3, a4, c1, c3, c4, d1, d3, d4);
  matrix_[9] = -determinant3x3(a1, a3, a4, b1, b3, b4, d1, d3, d4);
  matrix_[13] = determinant3x3(a1, a3, a4, b1, b3, b4, c1, c3, c4);

  matrix_[2] = determinant3x3(b1, b2, b4, c1, c2, c4, d1, d2, d4);
  matrix_[6] = -determinant3x3(a1, a2, a4, c1, c2, c4, d1, d2, d4);
  matrix_[10] = determinant3x3(a1, a2, a4, b1, b2, b4, d1, d2, d4);
  matrix_[14] = -determinant3x3(a1, a2, a4, b1, b2, b4, c1, c2, c4);

  matrix_[3] = -determinant3x3(b1, b2, b3, c1, c2, c3, d1, d2, d3);
  matrix_[7] = determinant3x3(a1, a2, a3, c1, c2, c3, d1, d2, d3);
  matrix_[11] = -determinant3x3(a1, a2, a3, b1, b2, b3, d1, d2, d3);
  matrix_[15] = determinant3x3(a1, a2, a3, b1, b2, b3, c1, c2, c3);
}

bool TransformMatrix3D::invert() {
  const auto det = determinant();

  // If the determinant is invalid (zero, very small number, etc.), then the
  // matrix is not invertible
  if (!std::isnormal(det)) {
    return false;
  }

  adjugate();
  for (size_t i = 0; i < 16; ++i) {
    matrix_[i] /= det;
  }

  return true;
}

void TransformMatrix3D::translate3d(const Vector3D &translation) {
  for (size_t i = 0; i < 4; ++i) {
    matrix_[12 + i] += translation[0] * matrix_[i] +
        translation[1] * matrix_[4 + i] + translation[2] * matrix_[8 + i];
  }
}

void TransformMatrix3D::scale3d(const Vector3D &scale) {
  for (size_t i = 0; i < 4; ++i) {
    matrix_[i] *= scale[0];
    matrix_[4 + i] *= scale[1];
    matrix_[8 + i] *= scale[2];
  }
}

std::optional<TransformMatrix3D::Decomposed> TransformMatrix3D::decompose()
    const {
  auto matrixCp = *this;

  if (!matrixCp.normalize()) {
    return std::nullopt;
  }
  const auto perspective = matrixCp.computePerspective();
  if (!perspective) {
    return std::nullopt;
  }
  const auto translation = matrixCp.getTranslation();

  // Move the remaining matrix to 3 separate column vectors for easier
  // processing
  std::array<Vector3D, 3> rows;
  for (size_t i = 0; i < 3; ++i) {
    rows[i] =
        Vector3D(matrixCp[i * 4], matrixCp[i * 4 + 1], matrixCp[i * 4 + 2]);
  }

  auto [scale, skew] = computeScaleAndSkew(rows);

  // At this point, the matrix (in rows) is orthonormal.
  // Check for a coordinate system flip. If the determinant
  // is negative, then negate the matrix and the scaling factors.
  if (rows[0].dot(rows[1].cross(rows[2])) < 0) {
    scale *= -1;
    for (auto &row : rows) {
      row *= -1;
    }
  }
  const auto rotation = computeQuaternion(rows);

  return TransformMatrix3D::Decomposed{
      .scale = scale,
      .skew = skew,
      .quaternion = rotation,
      .translation = translation,
      .perspective = perspective.value()};
}

TransformMatrix3D TransformMatrix3D::recompose(
    const TransformMatrix3D::Decomposed &decomposed) {
  auto result = TransformMatrix3D::Identity();

  // Start from applying perspective
  for (size_t i = 0; i < 4; ++i) {
    result[3 + i * 4] = decomposed.perspective[i];
  }

  // Apply translation
  result.translate3d(decomposed.translation);

  // Apply rotation
  result = fromQuaternion(decomposed.quaternion) * result;

  // Apply skew
  auto hasSkewYZ = decomposed.skew[2] != 0;
  auto hasSkewXZ = decomposed.skew[1] != 0;
  auto hasSkewXY = decomposed.skew[0] != 0;

  if (hasSkewYZ || hasSkewXZ || hasSkewXY) {
    auto tmp = TransformMatrix3D::Identity();
    if (hasSkewYZ) { // YZ
      tmp[9] = decomposed.skew[2];
      result = tmp * result;
    }
    if (hasSkewXZ) { // XZ
      tmp[8] = decomposed.skew[1];
      result = tmp * result;
    }
    if (hasSkewXY) { // XY
      tmp[4] = decomposed.skew[0];
      result = tmp * result;
    }
  }

  // Apply scale
  result.scale3d(decomposed.scale);

  return result;
}

TransformMatrix3D TransformMatrix3D::fromQuaternion(const Quaternion &q) {
  const double xx = q.x * q.x;
  const double yy = q.y * q.y;
  const double zz = q.z * q.z;
  const double xz = q.x * q.z;
  const double xy = q.x * q.y;
  const double yz = q.y * q.z;
  const double xw = q.w * q.x;
  const double yw = q.w * q.y;
  const double zw = q.w * q.z;

  // clang-format off
  return TransformMatrix3D({
    1 - 2 * (yy + zz),     2 * (xy - zw),     2 * (xz + yw), 0,
        2 * (xy + zw), 1 - 2 * (xx + zz),     2 * (yz - xw), 0,
        2 * (xz - yw),     2 * (yz + xw), 1 - 2 * (xx + yy), 0,
                    0,                    0,              0, 1
  });
  // clang-format on
}

std::optional<Vector4D> TransformMatrix3D::computePerspective() const {
  auto perspectiveMatrix = *this;

  for (size_t i = 0; i < 3; ++i) {
    perspectiveMatrix[3 + i * 4] = 0;
  }
  perspectiveMatrix[15] = 1;

  if (perspectiveMatrix.isSingular()) {
    return std::nullopt;
  }

  if (matrix_[3] == 0 && matrix_[7] == 0 && matrix_[11] == 0) {
    // No perspective
    return Vector4D{0, 0, 0, 1};
  }

  // Invert and transpose the perspective matrix (we will solve the equation
  // by multiplying the rhs vector by the inverse of the perspective matrix)
  if (!perspectiveMatrix.invert()) {
    return std::nullopt;
  }
  perspectiveMatrix.transpose();

  // rhs is the right hand side of the equation we are trying to solve
  const Vector4D rhs(matrix_[3], matrix_[7], matrix_[11], matrix_[15]);
  // Solve the equation
  return rhs * perspectiveMatrix;
}

Vector3D TransformMatrix3D::getTranslation() const {
  return Vector3D(matrix_[12], matrix_[13], matrix_[14]);
}

std::pair<Vector3D, Vector3D> TransformMatrix3D::computeScaleAndSkew(
    std::array<Vector3D, 3> &rows) {
  Vector3D scale, skew;

  // Compute X scale factor and normalize first row
  scale[0] = rows[0].length();
  rows[0].normalize();

  // Compute XY shear factor and make 2nd row orthogonal to 1st.
  skew[0] = rows[0].dot(rows[1]);
  rows[1] = rows[1].addScaled(rows[0], -skew[0]);

  // Now, compute Y scale and normalize 2nd row.
  scale[1] = rows[1].length();
  rows[1].normalize();
  skew[0] /= scale[1]; // normalize XY shear

  // Compute XZ and YZ shears, orthogonalize 3rd row
  skew[1] = rows[0].dot(rows[2]);
  rows[2] = rows[2].addScaled(rows[0], -skew[1]);
  skew[2] = rows[1].dot(rows[2]);
  rows[2] = rows[2].addScaled(rows[1], -skew[2]);

  // Next, get Z scale and normalize 3rd row
  scale[2] = rows[2].length();
  rows[2].normalize();
  skew[1] /= scale[2]; // normalize XZ shear
  skew[2] /= scale[2]; // normalize YZ shear

  return {scale, skew};
}

Quaternion TransformMatrix3D::computeQuaternion(std::array<Vector3D, 3> &rows) {
  double m00 = rows[0][0];
  double m01 = rows[0][1];
  double m02 = rows[0][2];

  double m10 = rows[1][0];
  double m11 = rows[1][1];
  double m12 = rows[1][2];

  double m20 = rows[2][0];
  double m21 = rows[2][1];
  double m22 = rows[2][2];

  Quaternion q;
  double trace = m00 + m11 + m22; // Trace of the matrix

  if (trace > 0.0) {
    double s = 0.5 / sqrt(trace + 1.0);
    q.w = 0.25 / s;
    q.x = (m21 - m12) * s;
    q.y = (m02 - m20) * s;
    q.z = (m10 - m01) * s;
  } else {
    if (m00 > m11 && m00 > m22) {
      double s = 2.0 * sqrt(1.0 + m00 - m11 - m22);
      q.w = (m21 - m12) / s;
      q.x = 0.25 * s;
      q.y = (m01 + m10) / s;
      q.z = (m02 + m20) / s;
    } else if (m11 > m22) {
      double s = 2.0 * sqrt(1.0 + m11 - m00 - m22);
      q.w = (m02 - m20) / s;
      q.x = (m01 + m10) / s;
      q.y = 0.25 * s;
      q.z = (m12 + m21) / s;
    } else {
      double s = 2.0 * sqrt(1.0 + m22 - m00 - m11);
      q.w = (m10 - m01) / s;
      q.x = (m02 + m20) / s;
      q.y = (m12 + m21) / s;
      q.z = 0.25 * s;
    }
  }

  return q;
}

/**
 * Calculate the determinant of a 3x3 matrix
 *
 * | a b c |
 * | d e f |
 * | g h i |
 */
double TransformMatrix3D::determinant3x3(
    const double a,
    const double b,
    const double c,
    const double d,
    const double e,
    const double f,
    const double g,
    const double h,
    const double i) {
  return (a * e * i) + (b * f * g) + (c * d * h) - (c * e * g) - (b * d * i) -
      (a * f * h);
}

} // namespace reanimated::css
