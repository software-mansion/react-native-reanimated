#pragma once

#include <reanimated/CSS/common/Quaternion.h>
#include <reanimated/CSS/common/definitions.h>
#include <reanimated/CSS/common/vectors.h>

#include <folly/dynamic.h>
#include <string>
#include <utility>

namespace reanimated::css {

struct DecomposedTransformMatrix {
  Vector3D scale;
  Vector3D skew;
  Quaternion quaternion;
  Vector3D translation;
  Vector4D perspective;

#ifndef NDEBUG
  friend std::ostream &operator<<(
      std::ostream &os,
      const DecomposedTransformMatrix &decomposed);
#endif // NDEBUG

  DecomposedTransformMatrix interpolate(
      double progress,
      const DecomposedTransformMatrix &other) const;
};

class TransformMatrix {
 public:
  explicit TransformMatrix(const Vec16Array &matrix);
  explicit TransformMatrix(const Matrix4x4 &matrix);
  explicit TransformMatrix(jsi::Runtime &rt, const jsi::Value &value);
  explicit TransformMatrix(const folly::dynamic &value);

  static TransformMatrix Identity();
  static TransformMatrix Perspective(double value);
  static TransformMatrix RotateX(double value);
  static TransformMatrix RotateY(double value);
  static TransformMatrix RotateZ(double value);
  static TransformMatrix Scale(double value);
  static TransformMatrix ScaleX(double value);
  static TransformMatrix ScaleY(double value);
  static TransformMatrix TranslateX(double value);
  static TransformMatrix TranslateY(double value);
  static TransformMatrix SkewX(double value);
  static TransformMatrix SkewY(double value);

  std::array<double, 4> &operator[](size_t rowIdx);
  const std::array<double, 4> &operator[](size_t rowIdx) const;
  bool operator==(const TransformMatrix &other) const;
  TransformMatrix operator*(const TransformMatrix &rhs) const;
  TransformMatrix operator*=(const TransformMatrix &rhs);

#ifndef NDEBUG
  friend std::ostream &operator<<(
      std::ostream &os,
      const TransformMatrix &matrix);
#endif // NDEBUG

  std::string toString() const;
  folly::dynamic toDynamic() const;

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
  static std::pair<Vector3D, Vector3D> computeScaleAndSkew(
      std::array<Vector3D, 3> &rows);
  static Quaternion computeQuaternion(std::array<Vector3D, 3> &columns);

  inline static double determinant3x3(
      double a,
      double b,
      double c,
      double d,
      double e,
      double f,
      double g,
      double h,
      double i);
};

Vector4D operator*(const Vector4D &v, const TransformMatrix &m);

} // namespace reanimated::css
