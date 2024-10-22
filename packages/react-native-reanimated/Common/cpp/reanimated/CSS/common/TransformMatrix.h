#pragma once

#include <reanimated/CSS/common/Quaternion.h>
#include <reanimated/CSS/common/definitions.h>
#include <reanimated/CSS/common/vectors.h>

namespace reanimated {

struct DecomposedTransformMatrix {
  Vector3D scale;
  Vector3D skew;
  Quaternion quaternion;
  Vector3D translation;
  Vector4D perspective;

  friend std::ostream &operator<<(
      std::ostream &os,
      const DecomposedTransformMatrix &decomposed);

  DecomposedTransformMatrix interpolate(
      const double progress,
      const DecomposedTransformMatrix &other) const;
};

class TransformMatrix {
 public:
  TransformMatrix(const Vec16Array &matrix);
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

  std::array<double, 4> &operator[](const size_t rowIdx);
  const std::array<double, 4> &operator[](const size_t rowIdx) const;
  TransformMatrix operator*(const TransformMatrix &rhs) const;
  TransformMatrix operator*=(const TransformMatrix &rhs);
  friend std::ostream &operator<<(
      std::ostream &os,
      const TransformMatrix &matrix);

  std::string toString() const;
  jsi::Value toJSIValue(jsi::Runtime &rt) const;

  bool isSingular() const;
  bool normalize();
  double determinant() const;
  void adjugate();
  bool invert();
  void transpose();
  void translate3d(const Vector3D &translation);
  void scale3d(const Vector3D &scale);

  std::optional<DecomposedTransformMatrix> decompose() const;
  static TransformMatrix recompose(const DecomposedTransformMatrix &decomposed);
  static TransformMatrix fromQuaternion(const Quaternion &q);

 private:
  Matrix4x4 matrix_;

  std::optional<Vector4D> computePerspective() const;
  Vector3D getTranslation() const;
  std::pair<Vector3D, Vector3D> computeScaleAndSkew(
      std::array<Vector3D, 3> &rows) const;
  Quaternion computeQuaternion(std::array<Vector3D, 3> &columns) const;

  inline static double determinant3x3(
      const double a,
      const double b,
      const double c,
      const double d,
      const double e,
      const double f,
      const double g,
      const double h,
      const double i);

  static const Matrix4x4 IDENTITY_MATRIX_4x4;
};

Vector4D operator*(const Vector4D &v, const TransformMatrix &m);

} // namespace reanimated
