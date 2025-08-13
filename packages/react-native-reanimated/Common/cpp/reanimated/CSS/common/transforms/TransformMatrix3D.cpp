#include <reanimated/CSS/common/transforms/TransformMatrix3D.h>

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

TransformMatrix3D TransformMatrix3D::Decomposed::recompose() const {
  auto result = TransformMatrix3D::Identity();

  // Start from applying perspective
  for (size_t i = 0; i < 4; ++i) {
    result[3 + i * 4] = perspective[i];
  }

  // Apply translation
  result.translate3d(translation);

  // Apply rotation
  result = TransformMatrix3D::fromQuaternion(quaternion) * result;

  // Apply skew
  auto hasSkewYZ = skew[2] != 0;
  auto hasSkewXZ = skew[1] != 0;
  auto hasSkewXY = skew[0] != 0;

  if (hasSkewYZ || hasSkewXZ || hasSkewXY) {
    auto tmp = TransformMatrix3D::Identity();
    if (hasSkewYZ) { // YZ
      tmp[9] = skew[2];
      result = tmp * result;
    }
    if (hasSkewXZ) { // XZ
      tmp[9] = 0;
      tmp[8] = skew[1];
      result = tmp * result;
    }
    if (hasSkewXY) { // XY
      tmp[8] = 0;
      tmp[4] = skew[0];
      result = tmp * result;
    }
  }

  // Apply scale
  result.scale3d(scale);

  return result;
}

#ifndef NDEBUG

std::ostream &operator<<(
    std::ostream &os,
    const TransformMatrix3D::Decomposed &decomposed) {
  os << "DecomposedTransformMatrix(scale=" << decomposed.scale
     << ", skew=" << decomposed.skew << ", quaternion=" << decomposed.quaternion
     << ", translation=" << decomposed.translation
     << ", perspective=" << decomposed.perspective << ")";
  return os;
}

#endif // NDEBUG

TransformMatrix3D::TransformMatrix3D(Vec16Array matrix)
    : matrix_(std::move(matrix)) {}

TransformMatrix3D::TransformMatrix3D(
    jsi::Runtime &rt,
    const jsi::Value &value) {
  const auto array = value.asObject(rt).asArray(rt);
  if (array.size(rt) != 16) {
    throw std::invalid_argument(
        "[Reanimated] Matrix array should have 16 elements");
  }

  for (size_t i = 0; i < 16; ++i) {
    matrix_[i] = array.getValueAtIndex(rt, i).asNumber();
  }
}

TransformMatrix3D::TransformMatrix3D(const folly::dynamic &array) {
  if (!array.isArray() || array.size() != 16) {
    throw std::invalid_argument(
        "[Reanimated] Matrix array should have 16 elements");
  }

  for (size_t i = 0; i < 16; ++i) {
    matrix_[i] = array[i].asDouble();
  }
}

TransformMatrix3D TransformMatrix3D::Identity() {
  // clang-format off
  return TransformMatrix3D(Vec16Array{
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
  });
  // clang-format on
}

TransformMatrix3D TransformMatrix3D::Perspective(const double v) {
  if (v == 0) {
    // Ignore perspective if it is invalid
    return TransformMatrix3D::Identity();
  }
  // clang-format off
  return TransformMatrix3D(Vec16Array{
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, -1.0 / v,
    0, 0, 0, 1
  });
  // clang-format on
}

TransformMatrix3D TransformMatrix3D::RotateX(const double v) {
  const auto cosVal = std::cos(v);
  const auto sinVal = std::sin(v);
  // clang-format off
  return TransformMatrix3D(Vec16Array{
    1,       0,      0, 0,
    0,  cosVal, sinVal, 0,
    0, -sinVal, cosVal, 0,
    0,       0,      0, 1
  });
  // clang-format on
}

TransformMatrix3D TransformMatrix3D::RotateY(const double v) {
  const auto cosVal = std::cos(v);
  const auto sinVal = std::sin(v);
  // clang-format off
  return TransformMatrix3D(Vec16Array{
    cosVal, 0, -sinVal, 0,
         0, 1,       0, 0,
    sinVal, 0,  cosVal, 0,
         0, 0,       0, 1
  });
  // clang-format on
}

TransformMatrix3D TransformMatrix3D::RotateZ(const double v) {
  const auto cosVal = std::cos(v);
  const auto sinVal = std::sin(v);
  // clang-format off
  return TransformMatrix3D(Vec16Array{
     cosVal, sinVal, 0, 0,
    -sinVal, cosVal, 0, 0,
          0,      0, 1, 0,
          0,      0, 0, 1
  });
  // clang-format on
}

TransformMatrix3D TransformMatrix3D::Scale(const double v) {
  // clang-format off
  return TransformMatrix3D(Vec16Array{
    v, 0, 0, 0,
    0, v, 0, 0,
    0, 0, v, 0,
    0, 0, 0, 1
  });
  // clang-format on
}

TransformMatrix3D TransformMatrix3D::ScaleX(const double v) {
  // clang-format off
  return TransformMatrix3D(Vec16Array{
    v, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
  });
  // clang-format on
}

TransformMatrix3D TransformMatrix3D::ScaleY(const double v) {
  // clang-format off
  return TransformMatrix3D(Vec16Array{
    1, 0, 0, 0,
    0, v, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
  });
  // clang-format on
}

TransformMatrix3D TransformMatrix3D::TranslateX(const double v) {
  // clang-format off
  return TransformMatrix3D(Vec16Array{
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    v, 0, 0, 1
  });
  // clang-format on
}

TransformMatrix3D TransformMatrix3D::TranslateY(const double v) {
  // clang-format off
  return TransformMatrix3D(Vec16Array{
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, v, 0, 1
  });
  // clang-format on
}

TransformMatrix3D TransformMatrix3D::SkewX(const double v) {
  const auto tanVal = std::tan(v);
  // clang-format off
  return TransformMatrix3D(Vec16Array{
         1, 0, 0, 0,
    tanVal, 1, 0, 0,
         0, 0, 1, 0,
         0, 0, 0, 1
  });
  // clang-format on
}

TransformMatrix3D TransformMatrix3D::SkewY(const double v) {
  const auto tanVal = std::tan(v);
  // clang-format off
  return TransformMatrix3D(Vec16Array{
    1, tanVal, 0, 0,
    0,      1, 0, 0,
    0,      0, 1, 0,
    0,      0, 0, 1
  });
  // clang-format on
}

double &TransformMatrix3D::operator[](const size_t index) {
  return matrix_[index];
}

const double &TransformMatrix3D::operator[](const size_t index) const {
  return matrix_[index];
}

bool TransformMatrix3D::operator==(const TransformMatrix3D &other) const {
  return matrix_ == other.matrix_;
}

TransformMatrix3D TransformMatrix3D::operator*(
    const TransformMatrix3D &rhs) const {
  const auto &a = matrix_;
  const auto &b = rhs.matrix_;

  Vec16Array result{};
  for (size_t i = 0; i < 4; ++i) {
    for (size_t j = 0; j < 4; ++j) {
      for (size_t k = 0; k < 4; ++k) {
        result[i * 4 + j] += a[i * 4 + k] * b[k * 4 + j];
      }
    }
  }

  return TransformMatrix3D(result);
}

TransformMatrix3D TransformMatrix3D::operator*=(const TransformMatrix3D &rhs) {
  *this = *this * rhs;
  return *this;
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
  return matrix.print(os);
}

#endif // NDEBUG

std::string TransformMatrix3D::toString() const {
  std::string result = "[";
  for (size_t i = 0; i < 16; ++i) {
    result += std::to_string(matrix_[i]);
    if (i < 15) {
      result += ", ";
    }
  }
  result += "]";
  return result;
}

folly::dynamic TransformMatrix3D::toDynamic() const {
  folly::dynamic result = folly::dynamic::array;
  for (size_t i = 0; i < 16; ++i) {
    result.push_back(matrix_[i]);
  }
  return result;
}

bool TransformMatrix3D::isSingular() const {
  return determinant() == 0;
}

bool TransformMatrix3D::normalize() {
  if (matrix_[15] == 0) {
    return false;
  }

  for (size_t i = 0; i < 16; ++i) {
    matrix_[i] /= matrix_[15];
  }

  return true;
}

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

void TransformMatrix3D::transpose() {
  for (size_t i = 0; i < 4; ++i) {
    for (size_t j = i + 1; j < 4; ++j) {
      std::swap(matrix_[i * 4 + j], matrix_[j * 4 + i]);
    }
  }
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
  // is -1, then negate the matrix and the scaling factors.
  if (rows[0].dot(rows[1].cross(rows[2])) < 0) {
    for (size_t i = 0; i < 3; ++i) {
      scale[i] *= -1;
      rows[i] *= -1;
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
  return TransformMatrix3D(Vec16Array{
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

#ifndef NDEBUG
std::ostream &TransformMatrix3D::print(std::ostream &os) const {
  os << "TransformMatrix3D([";
  for (size_t i = 0; i < 16; ++i) {
    if (i > 0)
      os << ", ";
    os << matrix_[i];
  }
  os << "])";
  return os;
}
#endif // NDEBUG

} // namespace reanimated::css
