#include <reanimated/CSS/common/TransformMatrix.h>

namespace reanimated::css {

DecomposedTransformMatrix DecomposedTransformMatrix::interpolate(
    const double progress,
    const DecomposedTransformMatrix &other) const {
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
    const DecomposedTransformMatrix &decomposed) {
  os << "DecomposedTransformMatrix(scale=" << decomposed.scale
     << ", skew=" << decomposed.skew << ", quaternion=" << decomposed.quaternion
     << ", translation=" << decomposed.translation
     << ", perspective=" << decomposed.perspective << ")";
  return os;
}

#endif // NDEBUG

TransformMatrix::TransformMatrix(const Vec16Array &matrix) {
  for (size_t i = 0; i < 16; ++i) {
    matrix_[i / 4][i % 4] = matrix[i];
  }
}

TransformMatrix::TransformMatrix(const Matrix4x4 &matrix) : matrix_(matrix) {}

TransformMatrix::TransformMatrix(jsi::Runtime &rt, const jsi::Value &value) {
  const auto array = value.asObject(rt).asArray(rt);
  if (array.size(rt) != 16) {
    throw std::invalid_argument(
        "[Reanimated] Matrix array should have 16 elements");
  }

  for (size_t i = 0; i < 16; ++i) {
    matrix_[i / 4][i % 4] = array.getValueAtIndex(rt, i).asNumber();
  }
}

TransformMatrix::TransformMatrix(const folly::dynamic &array) {
  if (!array.isArray() || array.size() != 16) {
    throw std::invalid_argument(
        "[Reanimated] Matrix array should have 16 elements");
  }

  for (size_t i = 0; i < 16; ++i) {
    matrix_[i / 4][i % 4] = array[i].getDouble();
  }
}

TransformMatrix TransformMatrix::Identity() {
  return TransformMatrix({{// clang-format off
      {1, 0, 0, 0},
      {0, 1, 0, 0},
      {0, 0, 1, 0},
      {0, 0, 0, 1}
  }}); // clang-format on
}

TransformMatrix TransformMatrix::Perspective(const double v) {
  if (v == 0) {
    // Ignore perspective if it is invalid
    return TransformMatrix::Identity();
  }
  return TransformMatrix({{// clang-format off
    {1, 0, 0, 0},
    {0, 1, 0, 0},
    {0, 0, 1, -1.0 / v},
    {0, 0, 0, 1}
  }}); // clang-format on
}

TransformMatrix TransformMatrix::RotateX(const double v) {
  const auto cosVal = std::cos(v);
  const auto sinVal = std::sin(v);
  return TransformMatrix({{// clang-format off
    {1,       0,      0, 0},
    {0,  cosVal, sinVal, 0},
    {0, -sinVal, cosVal, 0},
    {0,       0,      0, 1}
  }}); // clang-format on
}

TransformMatrix TransformMatrix::RotateY(const double v) {
  const auto cosVal = std::cos(v);
  const auto sinVal = std::sin(v);
  return TransformMatrix({{// clang-format off
    {cosVal, 0, -sinVal, 0},
    {     0, 1,       0, 0},
    {sinVal, 0,  cosVal, 0},
    {     0, 0,       0, 1}
  }}); // clang-format on
}

TransformMatrix TransformMatrix::RotateZ(const double v) {
  const auto cosVal = std::cos(v);
  const auto sinVal = std::sin(v);
  return TransformMatrix({{// clang-format off
    { cosVal, sinVal, 0, 0},
    {-sinVal, cosVal, 0, 0},
    {      0,      0, 1, 0},
    {      0,      0, 0, 1}
  }}); // clang-format on
}

TransformMatrix TransformMatrix::Scale(const double v) {
  return TransformMatrix({{// clang-format off
    {v, 0, 0, 0},
    {0, v, 0, 0},
    {0, 0, v, 0},
    {0, 0, 0, 1}
  }}); // clang-format on
}

TransformMatrix TransformMatrix::ScaleX(const double v) {
  return TransformMatrix({{// clang-format off
    {v, 0, 0, 0},
    {0, 1, 0, 0},
    {0, 0, 1, 0},
    {0, 0, 0, 1}
  }}); // clang-format on
}

TransformMatrix TransformMatrix::ScaleY(const double v) {
  return TransformMatrix({{// clang-format off
    {1, 0, 0, 0},
    {0, v, 0, 0},
    {0, 0, 1, 0},
    {0, 0, 0, 1}
  }}); // clang-format on
}

TransformMatrix TransformMatrix::TranslateX(const double v) {
  return TransformMatrix({{// clang-format off
    {1, 0, 0, 0},
    {0, 1, 0, 0},
    {0, 0, 1, 0},
    {v, 0, 0, 1}
  }}); // clang-format on
}

TransformMatrix TransformMatrix::TranslateY(const double v) {
  return TransformMatrix({{// clang-format off
    {1, 0, 0, 0},
    {0, 1, 0, 0},
    {0, 0, 1, 0},
    {0, v, 0, 1}
  }}); // clang-format on
}

TransformMatrix TransformMatrix::SkewX(const double v) {
  const auto tan = std::tan(v);
  return TransformMatrix({{// clang-format off
    {  1, 0, 0, 0},
    {tan, 1, 0, 0},
    {  0, 0, 1, 0},
    {  0, 0, 0, 1}
  }}); // clang-format on
}

TransformMatrix TransformMatrix::SkewY(const double v) {
  const auto tan = std::tan(v);
  return TransformMatrix({{// clang-format off
    {1, tan, 0, 0},
    {0,   1, 0, 0},
    {0,   0, 1, 0},
    {0,   0, 0, 1}
  }}); // clang-format on
}

std::array<double, 4> &TransformMatrix::operator[](const size_t rowIdx) {
  return matrix_[rowIdx];
}

const std::array<double, 4> &TransformMatrix::operator[](
    const size_t rowIdx) const {
  return matrix_[rowIdx];
}

bool TransformMatrix::operator==(const TransformMatrix &other) const {
  for (size_t i = 0; i < 4; ++i) {
    for (size_t j = 0; j < 4; ++j) {
      if (matrix_[i][j] != other.matrix_[i][j]) {
        return false;
      }
    }
  }
  return true;
}

TransformMatrix TransformMatrix::operator*(const TransformMatrix &rhs) const {
  const auto &a = matrix_;
  const auto &b = rhs.matrix_;
  Matrix4x4 result{};

  for (size_t i = 0; i < 4; ++i) {
    for (size_t j = 0; j < 4; ++j) {
      result[i][j] = 0;
      for (size_t k = 0; k < 4; ++k) {
        result[i][j] += a[i][k] * b[k][j];
      }
    }
  }

  return TransformMatrix(result);
}

TransformMatrix TransformMatrix::operator*=(const TransformMatrix &rhs) {
  *this = *this * rhs;
  return *this;
}

Vector4D operator*(const Vector4D &v, const TransformMatrix &m) {
  Vector4D result;

  for (size_t i = 0; i < 4; ++i) {
    result[i] = 0;
    for (size_t j = 0; j < 4; ++j) {
      result[i] += v[j] * m[j][i];
    }
  }

  return result;
}

#ifndef NDEBUG

std::ostream &operator<<(std::ostream &os, const TransformMatrix &matrix) {
  std::string result = "TransformMatrix{";
  for (size_t i = 0; i < 16; ++i) {
    result += std::to_string(matrix[i / 4][i % 4]);
    if (i < 15) {
      result += ", ";
    }
  }
  result += "}";
  return os << result;
}

#endif // NDEBUG

std::string TransformMatrix::toString() const {
  std::string result = "[";
  for (size_t i = 0; i < 16; ++i) {
    result += std::to_string(matrix_[i / 4][i % 4]);
    if (i < 15) {
      result += ", ";
    }
  }
  result += "]";
  return result;
}

folly::dynamic TransformMatrix::toDynamic() const {
  folly::dynamic result = folly::dynamic::array;
  for (size_t i = 0; i < 16; ++i) {
    result.push_back(matrix_[i / 4][i % 4]);
  }
  return result;
}

bool TransformMatrix::isSingular() const {
  return determinant() == 0;
}

bool TransformMatrix::normalize() {
  if (matrix_[3][3] == 0) {
    return false;
  }

  for (size_t i = 0; i < 4; ++i) {
    for (size_t j = 0; j < 4; ++j) {
      matrix_[i][j] /= matrix_[3][3];
    }
  }

  return true;
}

double TransformMatrix::determinant() const {
  const double a1 = matrix_[0][0];
  const double b1 = matrix_[0][1];
  const double c1 = matrix_[0][2];
  const double d1 = matrix_[0][3];

  const double a2 = matrix_[1][0];
  const double b2 = matrix_[1][1];
  const double c2 = matrix_[1][2];
  const double d2 = matrix_[1][3];

  const double a3 = matrix_[2][0];
  const double b3 = matrix_[2][1];
  const double c3 = matrix_[2][2];
  const double d3 = matrix_[2][3];

  const double a4 = matrix_[3][0];
  const double b4 = matrix_[3][1];
  const double c4 = matrix_[3][2];
  const double d4 = matrix_[3][3];

  return a1 * determinant3x3(b2, b3, b4, c2, c3, c4, d2, d3, d4) -
      b1 * determinant3x3(a2, a3, a4, c2, c3, c4, d2, d3, d4) +
      c1 * determinant3x3(a2, a3, a4, b2, b3, b4, d2, d3, d4) -
      d1 * determinant3x3(a2, a3, a4, b2, b3, b4, c2, c3, c4);
}

void TransformMatrix::adjugate() {
  const double a1 = matrix_[0][0];
  const double b1 = matrix_[0][1];
  const double c1 = matrix_[0][2];
  const double d1 = matrix_[0][3];

  const double a2 = matrix_[1][0];
  const double b2 = matrix_[1][1];
  const double c2 = matrix_[1][2];
  const double d2 = matrix_[1][3];

  const double a3 = matrix_[2][0];
  const double b3 = matrix_[2][1];
  const double c3 = matrix_[2][2];
  const double d3 = matrix_[2][3];

  const double a4 = matrix_[3][0];
  const double b4 = matrix_[3][1];
  const double c4 = matrix_[3][2];
  const double d4 = matrix_[3][3];

  matrix_[0][0] = determinant3x3(b2, b3, b4, c2, c3, c4, d2, d3, d4);
  matrix_[1][0] = -determinant3x3(a2, a3, a4, c2, c3, c4, d2, d3, d4);
  matrix_[2][0] = determinant3x3(a2, a3, a4, b2, b3, b4, d2, d3, d4);
  matrix_[3][0] = -determinant3x3(a2, a3, a4, b2, b3, b4, c2, c3, c4);

  matrix_[0][1] = -determinant3x3(b1, b3, b4, c1, c3, c4, d1, d3, d4);
  matrix_[1][1] = determinant3x3(a1, a3, a4, c1, c3, c4, d1, d3, d4);
  matrix_[2][1] = -determinant3x3(a1, a3, a4, b1, b3, b4, d1, d3, d4);
  matrix_[3][1] = determinant3x3(a1, a3, a4, b1, b3, b4, c1, c3, c4);

  matrix_[0][2] = determinant3x3(b1, b2, b4, c1, c2, c4, d1, d2, d4);
  matrix_[1][2] = -determinant3x3(a1, a2, a4, c1, c2, c4, d1, d2, d4);
  matrix_[2][2] = determinant3x3(a1, a2, a4, b1, b2, b4, d1, d2, d4);
  matrix_[3][2] = -determinant3x3(a1, a2, a4, b1, b2, b4, c1, c2, c4);

  matrix_[0][3] = -determinant3x3(b1, b2, b3, c1, c2, c3, d1, d2, d3);
  matrix_[1][3] = determinant3x3(a1, a2, a3, c1, c2, c3, d1, d2, d3);
  matrix_[2][3] = -determinant3x3(a1, a2, a3, b1, b2, b3, d1, d2, d3);
  matrix_[3][3] = determinant3x3(a1, a2, a3, b1, b2, b3, c1, c2, c3);
}

bool TransformMatrix::invert() {
  const auto det = determinant();

  // If the determinant is invalid (zero, very small number, etc.), then the
  // matrix is not invertible
  if (!std::isnormal(det)) {
    return false;
  }

  adjugate();
  for (size_t i = 0; i < 4; ++i) {
    for (size_t j = 0; j < 4; ++j) {
      matrix_[i][j] /= det;
    }
  }

  return true;
}

void TransformMatrix::transpose() {
  for (size_t i = 0; i < 4; ++i) {
    for (size_t j = i + 1; j < 4; ++j) {
      std::swap(matrix_[i][j], matrix_[j][i]);
    }
  }
}

void TransformMatrix::translate3d(const Vector3D &translation) {
  for (size_t i = 0; i < 4; ++i) {
    matrix_[3][i] += translation[0] * matrix_[0][i] +
        translation[1] * matrix_[1][i] + translation[2] * matrix_[2][i];
  }
}

void TransformMatrix::scale3d(const Vector3D &scale) {
  for (size_t i = 0; i < 4; ++i) {
    matrix_[0][i] *= scale[0];
    matrix_[1][i] *= scale[1];
    matrix_[2][i] *= scale[2];
  }
}

std::optional<DecomposedTransformMatrix> TransformMatrix::decompose() const {
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
    rows[i] = Vector3D(matrixCp[i][0], matrixCp[i][1], matrixCp[i][2]);
  }

  auto [scale, skew] = computeScaleAndSkew(rows);

  // At this point, the matrix (in rows) is orthonormal.
  // Check for a coordinate system flip.  If the determinant
  // is -1, then negate the matrix and the scaling factors.
  if (rows[0].dot(rows[1].cross(rows[2])) < 0) {
    for (size_t i = 0; i < 3; ++i) {
      scale[i] *= -1;
      rows[i] *= -1;
    }
  }
  const auto rotation = computeQuaternion(rows);

  return DecomposedTransformMatrix{
      .scale = scale,
      .skew = skew,
      .quaternion = rotation,
      .translation = translation,
      .perspective = perspective.value()};
}

TransformMatrix TransformMatrix::recompose(
    const DecomposedTransformMatrix &decomposed) {
  auto result = TransformMatrix::Identity();

  // Start from applying perspective
  for (size_t i = 0; i < 4; ++i) {
    result[i][3] = decomposed.perspective[i];
  }

  // Apply translation
  result.translate3d(decomposed.translation);

  // Apply rotation
  result = fromQuaternion(decomposed.quaternion) * result;

  // Apply skew
  auto tmp = TransformMatrix::Identity();
  if (decomposed.skew[2] != 0) { // YZ
    tmp[2][1] = decomposed.skew[2];
    result = tmp * result;
  }
  if (decomposed.skew[1] != 0) { // XZ
    tmp[2][1] = 0;
    tmp[2][0] = decomposed.skew[1];
    result = tmp * result;
  }
  if (decomposed.skew[0] != 0) { // XY
    tmp[2][0] = 0;
    tmp[1][0] = decomposed.skew[0];
    result = tmp * result;
  }

  // Apply scale
  result.scale3d(decomposed.scale);

  return result;
}

TransformMatrix TransformMatrix::fromQuaternion(const Quaternion &q) {
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
  return TransformMatrix({{
    {1 - 2 * (yy + zz),     2 * (xy - zw),     2 * (xz + yw), 0},
    {    2 * (xy + zw), 1 - 2 * (xx + zz),     2 * (yz - xw), 0},
    {    2 * (xz - yw),     2 * (yz + xw), 1 - 2 * (xx + yy), 0},
    {                0,                  0,                0, 1}
  }}); // clang-format on
}

std::optional<Vector4D> TransformMatrix::computePerspective() const {
  auto perspectiveMatrix = *this;

  for (size_t i = 0; i < 3; ++i) {
    perspectiveMatrix[i][3] = 0;
  }
  perspectiveMatrix[3][3] = 1;

  if (perspectiveMatrix.isSingular()) {
    return std::nullopt;
  }

  if (matrix_[0][3] == 0 && matrix_[1][3] == 0 && matrix_[2][3] == 0) {
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
  const Vector4D rhs(
      matrix_[0][3], matrix_[1][3], matrix_[2][3], matrix_[3][3]);
  // Solve the equation
  return rhs * perspectiveMatrix;
}

Vector3D TransformMatrix::getTranslation() const {
  return Vector3D(matrix_[3][0], matrix_[3][1], matrix_[3][2]);
}

std::pair<Vector3D, Vector3D> TransformMatrix::computeScaleAndSkew(
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

Quaternion TransformMatrix::computeQuaternion(std::array<Vector3D, 3> &rows) {
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
double TransformMatrix::determinant3x3(
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
