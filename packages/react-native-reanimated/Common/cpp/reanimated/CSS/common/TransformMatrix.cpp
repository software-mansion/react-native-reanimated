#include <reanimated/CSS/common/TransformMatrix.h>

namespace reanimated {

// clang-format off
const Matrix4x4 TransformMatrix::IDENTITY_MATRIX_4x4 = {{
    {1, 0, 0, 0},
    {0, 1, 0, 0},
    {0, 0, 1, 0},
    {0, 0, 0, 1}}};
// clang-format on

TransformMatrix::TransformMatrix() : matrix_(IDENTITY_MATRIX_4x4) {}

TransformMatrix::TransformMatrix(const Vector16 &matrix) {
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

TransformMatrix TransformMatrix::Identity() {
  return TransformMatrix({{// clang-format off
      {1, 0, 0, 0},
      {0, 1, 0, 0},
      {0, 0, 1, 0},
      {0, 0, 0, 1}
  }}); // clang-format on
}

TransformMatrix TransformMatrix::Perspective(const double v) {
  return TransformMatrix({{// clang-format off
    {1, 0, 0, 0}, 
    {0, 1, 0, 0}, 
    {0, 0, 1, -1.0 / v}, 
    {0, 0, 0, 1}
  }}); // clang-format on
}

TransformMatrix TransformMatrix::RotateX(const double v) {
  const auto cos = std::cos(v);
  const auto sin = std::sin(v);
  return TransformMatrix({{// clang-format off
    {1,    0,   0, 0}, 
    {0,  cos, sin, 0}, 
    {0, -sin, cos, 0}, 
    {0,    0,   0, 1}
  }}); // clang-format on
}

TransformMatrix TransformMatrix::RotateY(const double v) {
  const auto cos = std::cos(v);
  const auto sin = std::sin(v);
  return TransformMatrix({{// clang-format off
    {cos, 0, -sin, 0}, 
    {  0, 1,    0, 0}, 
    {sin, 0,  cos, 0}, 
    {  0, 0,    0, 1}
  }}); // clang-format on
}

TransformMatrix TransformMatrix::RotateZ(const double v) {
  const auto cos = std::cos(v);
  const auto sin = std::sin(v);
  return TransformMatrix({{// clang-format off
    { cos, sin, 0, 0}, 
    {-sin, cos, 0, 0}, 
    {   0,   0, 1, 0}, 
    {   0,   0, 0, 1}
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
  const auto tan = std::cos(v);
  return TransformMatrix({{// clang-format off
    {1, tan, 0, 0}, 
    {0,   1, 0, 0}, 
    {0,   0, 1, 0}, 
    {0,   0, 0, 1}
  }}); // clang-format on
}

TransformMatrix TransformMatrix::SkewY(const double v) {
  const auto tan = std::tan(v);
  return TransformMatrix({{// clang-format off
    {  1, 0, 0, 0}, 
    {tan, 1, 0, 0}, 
    {  0, 0, 1, 0}, 
    {  0, 0, 0, 1}
  }}); // clang-format on
}

jsi::Value TransformMatrix::toJSIValue(jsi::Runtime &rt) const {
  jsi::Array result(rt, 16);

  for (size_t i = 0; i < 16; ++i) {
    result.setValueAtIndex(rt, i, matrix_[i / 4][i % 4]);
  }

  return result;
}

Vector4 &TransformMatrix::operator[](const size_t rowIdx) {
  return matrix_[rowIdx];
}

const Vector4 &TransformMatrix::operator[](const size_t rowIdx) const {
  return matrix_[rowIdx];
}

TransformMatrix TransformMatrix::operator*(const TransformMatrix &rhs) const {
  TransformMatrix result;

  const auto &lhs = matrix_;
  const auto &rhsMatrix = rhs.matrix_;

  for (int row = 0; row < 4; ++row) {
    for (int col = 0; col < 4; ++col) {
      result[row][col] = lhs[row][0] * rhsMatrix[0][col] +
          lhs[row][1] * rhsMatrix[1][col] + lhs[row][2] * rhsMatrix[2][col] +
          lhs[row][3] * rhsMatrix[3][col];
    }
  }

  return TransformMatrix(result);
}

} // namespace reanimated
