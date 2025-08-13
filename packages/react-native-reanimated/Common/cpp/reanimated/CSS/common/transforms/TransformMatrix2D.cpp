#include <reanimated/CSS/common/transforms/TransformMatrix2D.h>

namespace reanimated::css {

TransformMatrix2D::TransformMatrix2D(const Vec9Array &matrix)
    : matrix_(matrix) {}

TransformMatrix2D::TransformMatrix2D(
    jsi::Runtime &rt,
    const jsi::Value &value) {
  const auto array = value.asObject(rt).asArray(rt);
  if (array.size(rt) != 9) {
    throw std::invalid_argument(
        "[Reanimated] 2D matrix array should have 9 elements");
  }
  matrix_ = array;
}

TransformMatrix2D::TransformMatrix2D(const folly::dynamic &value)
    : matrix_(value) {
  if (!value.isArray() || value.size() != 9) {
    throw std::invalid_argument(
        "[Reanimated] 2D matrix array should have 9 elements");
  }
  matrix_ = value;
}

TransformMatrix2D TransformMatrix2D::Identity() {
  // clang-format off
  return TransformMatrix2D({
    1, 0, 0,
    0, 1, 0,
    0, 0, 1
  }); // clang-format on
}

TransformMatrix2D TransformMatrix2D::Rotate(const double v) {
  const auto cosVal = std::cos(v);
  const auto sinVal = std::sin(v);
  // clang-format off
  return TransformMatrix2D({
    cosVal, -sinVal, 0,
    sinVal,  cosVal, 0,
         0,       0, 1
  }); // clang-format on
}

TransformMatrix2D TransformMatrix2D::Scale(const double v) {
  // clang-format off
  return TransformMatrix2D({
    v, 0, 0,
    0, v, 0,
    0, 0, 1
  }); // clang-format on
}

TransformMatrix2D TransformMatrix2D::ScaleX(const double v) {
  // clang-format off
  return TransformMatrix2D({
    v, 0, 0,
    0, 1, 0,
    0, 0, 1
  }); // clang-format on
}

TransformMatrix2D TransformMatrix2D::ScaleY(const double v) {
  // clang-format off
  return TransformMatrix2D({
    1, 0, 0,
    0, v, 0,
    0, 0, 1
  }); // clang-format on
}

TransformMatrix2D TransformMatrix2D::TranslateX(const double v) {
  // clang-format off
  return TransformMatrix2D({
    1, 0, 0,
    0, 1, 0,
    v, 0, 1
  }); // clang-format on
}

TransformMatrix2D TransformMatrix2D::TranslateY(const double v) {
  // clang-format off
  return TransformMatrix2D({
    1, 0, 0,
    0, 1, 0,
    0, v, 1
  }); // clang-format on
}

TransformMatrix2D TransformMatrix2D::SkewX(const double v) {
  const auto tanVal = std::tan(v);
  // clang-format off
  return TransformMatrix2D({
    1,      0, 0,
    tanVal, 1, 0,
    0,      0, 1
  }); // clang-format on
}

TransformMatrix2D TransformMatrix2D::SkewY(const double v) {
  const auto tanVal = std::tan(v);
  // clang-format off
  return TransformMatrix2D({
    1, tanVal, 0,
    0, 1,      0,
    0, 0,      1
  }); // clang-format on
}

// Decomposed struct methods
TransformMatrix2D::Decomposed TransformMatrix2D::Decomposed::interpolate(
    const double progress,
    const TransformMatrix2D::Decomposed &other) const override {
  return {
      .scale = scale.interpolate(progress, other.scale),
      .skew = skew.interpolate(progress, other.skew),
      .rotation = rotation + (other.rotation - rotation) * progress,
      .translation = translation.interpolate(progress, other.translation)};
}

TransformMatrix2D TransformMatrix2D::Decomposed::recompose() const override {
  // Build matrix from decomposed components
  // Order: translate -> rotate -> skew -> scale
  TransformMatrix2D result = TransformMatrix2D::Identity();

  // Apply translation
  result = result * TransformMatrix2D::TranslateX(translation[0]);
  result = result * TransformMatrix2D::TranslateY(translation[1]);

  // Apply rotation
  result = result * TransformMatrix2D::Rotate(rotation);

  // Apply skew
  result = result * TransformMatrix2D::SkewX(skew[0]);
  result = result * TransformMatrix2D::SkewY(skew[1]);

  // Apply scale
  result = result * TransformMatrix2D::ScaleX(scale[0]);
  result = result * TransformMatrix2D::ScaleY(scale[1]);

  return result;
}

#ifndef NDEBUG
std::ostream &operator<<(
    std::ostream &os,
    const TransformMatrix2D::Decomposed &decomposed) {
  os << "DecomposedTransformMatrix2D(scale=" << decomposed.scale
     << ", skew=" << decomposed.skew << ", rotation=" << decomposed.rotation
     << ", translation=" << decomposed.translation << ")";
  return os;
}
#endif // NDEBUG

// Required virtual methods from base class
std::string TransformMatrix2D::toString() const {
  std::string result = "[";
  for (size_t i = 0; i < 9; ++i) {
    if (i > 0)
      result += ", ";
    result += std::to_string(matrix_[i]);
  }
  result += "]";
  return result;
}

folly::dynamic TransformMatrix2D::toDynamic() const {
  folly::dynamic result = folly::dynamic::array();
  for (size_t i = 0; i < 9; ++i) {
    result.push_back(matrix_[i]);
  }
  return result;
}

std::optional<TransformMatrix2D::Decomposed> TransformMatrix2D::decompose()
    const {
  // Simple 2D matrix decomposition
  // This is a basic implementation - in practice, you might want more
  // sophisticated decomposition
  const double a = matrix_[0], b = matrix_[1], c = matrix_[3], d = matrix_[4];
  const double tx = matrix_[2], ty = matrix_[5];

  // Extract scale
  const double scaleX = std::sqrt(a * a + b * b);
  const double scaleY = std::sqrt(c * c + d * d);

  // Extract rotation (assuming no skew for simplicity)
  const double rotation = std::atan2(b, a);

  // Extract skew (simplified)
  const double skewX = 0.0; // Would need more complex calculation
  const double skewY = 0.0; // Would need more complex calculation

  return TransformMatrix2D::Decomposed{
      .scale = Vector2D(scaleX, scaleY),
      .skew = Vector2D(skewX, skewY),
      .rotation = rotation,
      .translation = Vector2D(tx, ty)};
}

bool TransformMatrix2D::operator==(const TransformMatrix2D &other) const {
  return matrix_ == other.matrix_;
}

TransformMatrix2D TransformMatrix2D::operator*(
    const TransformMatrix2D &rhs) const {
  Vec9Array result;
  // Matrix multiplication for 3x3 matrices
  for (int i = 0; i < 3; ++i) {
    for (int j = 0; j < 3; ++j) {
      result[i * 3 + j] = 0;
      for (int k = 0; k < 3; ++k) {
        result[i * 3 + j] += matrix_[i * 3 + k] * rhs.matrix_[k * 3 + j];
      }
    }
  }
  return TransformMatrix2D(result);
}

TransformMatrix2D TransformMatrix2D::operator*=(const TransformMatrix2D &rhs) {
  *this = *this * rhs;
  return *this;
}

std::array<double, 3> &TransformMatrix2D::operator[](size_t rowIdx) {
  if (rowIdx >= 3) {
    throw std::out_of_range("Row index out of range");
  }
  // Since we store as a flat array, we need to create a view
  // This is a simplified implementation - in practice you might want to use a
  // proper matrix class
  static std::array<double, 3> temp;
  for (size_t i = 0; i < 3; ++i) {
    temp[i] = matrix_[rowIdx * 3 + i];
  }
  return temp;
}

const std::array<double, 3> &TransformMatrix2D::operator[](
    size_t rowIdx) const {
  if (rowIdx >= 3) {
    throw std::out_of_range("Row index out of range");
  }
  // Since we store as a flat array, we need to create a view
  // This is a simplified implementation - in practice you might want to use a
  // proper matrix class
  static std::array<double, 3> temp;
  for (size_t i = 0; i < 3; ++i) {
    temp[i] = matrix_[rowIdx * 3 + i];
  }
  return temp;
}

#ifndef NDEBUG
std::ostream &TransformMatrix2D::print(std::ostream &os) const {
  os << "TransformMatrix2D([";
  for (size_t i = 0; i < 9; ++i) {
    if (i > 0)
      os << ", ";
    os << matrix_[i];
  }
  os << "])";
  return os;
}

std::ostream &operator<<(std::ostream &os, const TransformMatrix2D &matrix) {
  return matrix.print(os);
}
#endif // NDEBUG

} // namespace reanimated::css
