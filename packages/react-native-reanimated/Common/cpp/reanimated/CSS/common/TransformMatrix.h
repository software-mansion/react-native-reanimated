#pragma once

#include <reanimated/CSS/common/definitions.h>

namespace reanimated {

class TransformMatrix {
 public:
  TransformMatrix();
  TransformMatrix(const Vector16 &matrix);
  TransformMatrix(const Matrix4x4 &matrix);
  TransformMatrix(jsi::Runtime &rt, const jsi::Value &value);

  static TransformMatrix Identity();
  static TransformMatrix Perspective(const double value);
  static TransformMatrix RotateX(const double value);
  static TransformMatrix RotateY(const double value);
  static TransformMatrix RotateZ(const double value);
  static TransformMatrix Scale(const double value);
  static TransformMatrix ScaleX(const double value);
  static TransformMatrix ScaleY(const double value);
  static TransformMatrix TranslateX(const double value);
  static TransformMatrix TranslateY(const double value);
  static TransformMatrix SkewX(const double value);
  static TransformMatrix SkewY(const double value);

  jsi::Value toJSIValue(jsi::Runtime &rt) const;

  Vector4 &operator[](const size_t rowIdx);
  const Vector4 &operator[](const size_t rowIdx) const;
  TransformMatrix operator*(const TransformMatrix &rhs) const;

 private:
  Matrix4x4 matrix_;

  static const Matrix4x4 IDENTITY_MATRIX_4x4;
};

} // namespace reanimated
