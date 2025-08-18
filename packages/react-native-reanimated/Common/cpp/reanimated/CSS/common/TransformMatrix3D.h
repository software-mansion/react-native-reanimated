#pragma once

#include <reanimated/CSS/common/Quaternion.h>
#include <reanimated/CSS/common/TransformMatrix.h>
#include <reanimated/CSS/common/vectors.h>

#include <folly/dynamic.h>
#include <string>
#include <utility>

namespace reanimated::css {

namespace {
static constexpr size_t MATRIX_3D_DIMENSION = 4; // 4x4 matrix
}

class TransformMatrix3D
    : public TransformMatrixBase<TransformMatrix3D, MATRIX_3D_DIMENSION> {
 public:
  struct Decomposed {
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

    Decomposed interpolate(double progress, const Decomposed &other) const;
  };

  using TransformMatrixBase<TransformMatrix3D, MATRIX_3D_DIMENSION>::
      TransformMatrixBase;

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

  const bool operator==(const TransformMatrix3D &other) const {
    return matrix_ == other.matrix_;
  }

#ifndef NDEBUG
  friend std::ostream &operator<<(
      std::ostream &os,
      const TransformMatrix3D &matrix);
#endif // NDEBUG

  double determinant() const override;

  void adjugate();
  bool invert();
  void transpose();
  void translate3d(const Vector3D &translation);
  void scale3d(const Vector3D &scale);

  std::unique_ptr<TransformMatrix> expand(
      size_t targetDimension) const override;

  std::optional<Decomposed> decompose() const;
  static TransformMatrix3D recompose(const Decomposed &decomposed);
  static TransformMatrix3D fromQuaternion(const Quaternion &q);

 private:
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
