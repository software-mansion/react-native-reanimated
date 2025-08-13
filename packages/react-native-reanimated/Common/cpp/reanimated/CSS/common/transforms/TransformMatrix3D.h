#pragma once

#include <reanimated/CSS/common/definitions.h>
#include <reanimated/CSS/common/transforms/TransformMatrix.h>
#include <reanimated/CSS/common/transforms/DecomposedTransform.h>
#include <reanimated/CSS/common/vectors.h>

#include <reanimated/CSS/common/transforms/Quaternion.h>

#include <folly/dynamic.h>
#include <string>
#include <utility>

namespace reanimated::css {

class TransformMatrix3D : public TransformMatrix<
                              TransformMatrix3D,
                              Vec16Array,
                              TransformMatrix3D::Decomposed> {
 public:
  struct Decomposed : public DecomposedTransform<Decomposed, TransformMatrix3D> {
    Vector3D scale;
    Vector3D skew;
    Quaternion quaternion;
    Vector3D translation;
    Vector4D perspective;

#ifndef NDEBUG
    friend std::ostream &operator<<(
        std::ostream &os,
        const Decomposed &decomposed);
#endif // NDEBUG

    Decomposed interpolate(double progress, const Decomposed &other) const override;
    TransformMatrix3D recompose() const override;
  };

  explicit TransformMatrix3D(Vec16Array matrix);
  explicit TransformMatrix3D(jsi::Runtime &rt, const jsi::Value &value);
  explicit TransformMatrix3D(const folly::dynamic &value);

  static TransformMatrix3D Identity();
  static TransformMatrix3D Perspective(double value);
  static TransformMatrix3D RotateX(double value);
  static TransformMatrix3D RotateY(double value);
  static TransformMatrix3D RotateZ(double value);
  static TransformMatrix3D Scale(double value);
  static TransformMatrix3D ScaleX(double value);
  static TransformMatrix3D ScaleY(double value);
  static TransformMatrix3D TranslateX(double value);
  static TransformMatrix3D TranslateY(double value);
  static TransformMatrix3D SkewX(double value);
  static TransformMatrix3D SkewY(double value);

  double &operator[](size_t index);
  const double &operator[](size_t index) const;
  bool operator==(const TransformMatrix3D &other) const override;
  TransformMatrix3D operator*(const TransformMatrix3D &rhs) const override;
  TransformMatrix3D operator*=(const TransformMatrix3D &rhs) override;

#ifndef NDEBUG
  friend std::ostream &operator<<(
      std::ostream &os,
      const TransformMatrix3D &matrix);
  std::ostream &print(std::ostream &os) const override;
#endif // NDEBUG

  std::string toString() const override;
  folly::dynamic toDynamic() const override;
  std::optional<Decomposed> decompose() const override;

  bool isSingular() const;
  bool normalize();
  double determinant() const;
  void adjugate();
  bool invert();
  void transpose();
  void translate3d(const Vector3D &translation);
  void scale3d(const Vector3D &scale);

  static TransformMatrix3D fromQuaternion(const Quaternion &q);

 private:
  Vec16Array matrix_;

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

Vector4D operator*(const Vector4D &v, const TransformMatrix3D &m);

} // namespace reanimated::css
